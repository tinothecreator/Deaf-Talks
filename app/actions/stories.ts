"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { OwnedStoryError, ownedStory, storytellerContext } from "@/lib/media/stories";
import { finishSchema, uploadSchema } from "@/lib/media/validation";
import { STORY_BUCKET, VIDEO_EXTENSIONS } from "@/lib/media/limits";
import { checkVideoObject } from "@/lib/media/object";

export async function startStoryUpload(input: unknown) {
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let draftId: string | undefined;
  try {
    const { supabase, user, profile } = await storytellerContext();
    const value = parsed.data;
    const id = randomUUID();
    const path = `${user.id}/${id}/${randomUUID()}.${VIDEO_EXTENSIONS[value.type]}`;
    const { error } = await supabase.from("stories").insert({
      id, storyteller_id: user.id, title: value.title, caption_en: value.caption,
      video_path: path, status: "draft",
    });
    if (error) return { error: "We could not create your draft. Please try again." };
    draftId = id;
    // Credit is automatic; this is not an ownership editor or publication flow.
    const { error: creditError } = await supabase.from("ownership_settings").insert({
      story_id: id, credit_line: profile.display_name, usage: "private", consent_confirmed: false,
    });
    if (creditError) throw new Error("credit");
    const { data, error: signError } = await supabase.storage.from(STORY_BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (signError || !data) throw new Error("sign");
    return { storyId: id, signedUrl: data.signedUrl };
  } catch {
    if (draftId) await cancelStoryUpload(draftId);
    return { error: "We could not prepare the upload. Check your connection and try again." };
  }
}

export async function finishStoryUpload(input: unknown): Promise<{
  success?: boolean; error?: string; reasonCode?: string;
}> {
  // Log only fixed reason codes and size/type values, never SDK errors or paths.
  function fail(reasonCode: string, error: string, values?: Record<string, unknown>) {
    console.error(reasonCode, values ?? {});
    return { error, reasonCode };
  }
  const invalidVideo = "We could not confirm a valid uploaded video. Please retry or discard this upload.";
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) {
    const reasonCode = parsed.error.issues.some((issue) => issue.path[0] === "storyId")
      ? "CONFIRM_INVALID_STORY_ID" : "CONFIRM_INVALID_DURATION";
    return fail(reasonCode, "The video duration must be longer than 0 and no more than 60 seconds.");
  }
  let failureStage = "CONFIRM_CONTEXT_FAILED";
  try {
    const { supabase, story, user } = await ownedStory(parsed.data.storyId);
    if (story.duration_seconds !== null) return { success: true };
    failureStage = "CONFIRM_OBJECT_LOOKUP_FAILED";
    const { data: object, error } = await supabase.storage.from(STORY_BUCKET).info(story.video_path);
    if (error) return fail("CONFIRM_OBJECT_LOOKUP_FAILED", invalidVideo);
    if (!object) return fail("CONFIRM_OBJECT_NOT_FOUND", invalidVideo);
    // Storage .info() returns these at the top level, unlike .list() metadata.
    const size = object.size;
    const invalid = checkVideoObject(object);
    if (invalid) return fail(invalid, invalidVideo);
    failureStage = "CONFIRM_ROW_UPDATE_FAILED";
    const { data, error: saveError } = await supabase.from("stories").update({
      video_path: story.video_path, video_size_bytes: size,
      duration_seconds: Math.ceil(parsed.data.duration), updated_at: new Date().toISOString(),
    }).eq("id", story.id).eq("storyteller_id", user.id).is("duration_seconds", null).select("id").single();
    const saveMessage = "Your video uploaded, but we could not save its details. Please retry confirmation.";
    if (saveError) return fail("CONFIRM_ROW_UPDATE_FAILED", saveMessage);
    if (!data) return fail("CONFIRM_ROW_NOT_UPDATED", saveMessage);
    failureStage = "CONFIRM_REVALIDATE_FAILED";
    revalidatePath("/studio");
    return { success: true };
  } catch (cause) {
    return fail(cause instanceof OwnedStoryError ? cause.reasonCode : failureStage,
      "We could not confirm your upload. Check your connection and retry confirmation.");
  }
}

export async function cancelStoryUpload(input: unknown) {
  const parsed = z.uuid().safeParse(input);
  if (!parsed.success) return { error: "Invalid story." };
  try {
    const { supabase, story, user } = await ownedStory(parsed.data);
    // Do not delete a completed upload if its confirmation response was lost.
    if (story.duration_seconds !== null) return { error: "This story is already saved. Open My stories." };
    // Claim the incomplete row before removing bytes: concurrent confirmation
    // must never leave a completed story whose object was deleted by cancellation.
    const { data, error } = await supabase.from("stories").delete().eq("id", story.id)
      .eq("storyteller_id", user.id).is("duration_seconds", null).select("id").maybeSingle();
    if (error || !data) return { error: "Could not discard the draft. It may already be saved. Open My stories." };
    const { error: removeError } = await supabase.storage.from(STORY_BUCKET).remove([story.video_path]);
    revalidatePath("/studio");
    if (removeError) return { error: "Draft discarded. Its private file may need manual cleanup by the project team." };
    return { success: true };
  } catch {
    return { error: "Could not discard the upload. Please try again." };
  }
}
