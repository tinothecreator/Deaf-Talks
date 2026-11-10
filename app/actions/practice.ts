"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { learnerContext, ownedAttempt, PracticeAccessError } from "@/lib/practice/context";
import { practiceFinishSchema, practiceUploadSchema } from "@/lib/practice/validation";
import { PRACTICE_BUCKET, VIDEO_EXTENSIONS } from "@/lib/media/limits";
import { checkVideoObject } from "@/lib/media/object";

type Result = { success?: boolean; error?: string; reasonCode?: string };
const failure = (reasonCode: string, error = "We could not save this attempt. Retry the upload or discard it."): Result => ({ error, reasonCode });

export async function startPracticeUpload(input: unknown) {
  const parsed = practiceUploadSchema.safeParse(input);
  if (!parsed.success) return failure("START_INVALID_INPUT", parsed.error.issues[0].message);
  let attemptId: string | undefined;
  try {
    const { user, supabase } = await learnerContext();
    const value = parsed.data;
    // Both reads use the verified session and RLS, never the service role.
    const { data: story, error: storyError } = await supabase.from("stories").select("id").eq("id", value.storyId).maybeSingle();
    if (storyError || !story) return failure("START_STORY_UNAVAILABLE", "This story is unavailable for practice.");
    const { data: sign, error: signError } = await supabase.from("signs").select("id")
      .eq("id", value.signId).eq("story_id", story.id).maybeSingle();
    if (signError || !sign) return failure("START_SIGN_UNAVAILABLE", "Choose a sign from this story.");
    const id = randomUUID();
    const path = `${user.id}/${randomUUID()}.${VIDEO_EXTENSIONS[value.type]}`;
    const { error } = await supabase.from("practice_attempts").insert({
      id, learner_id: user.id, story_id: story.id, sign_id: sign.id, caption: value.caption,
      video_path: path, status: "uploading", expected_size_bytes: value.size, expected_content_type: value.type,
    });
    if (error) return failure("START_ROW_FAILED");
    attemptId = id;
    const { data, error: uploadError } = await supabase.storage.from(PRACTICE_BUCKET).createSignedUploadUrl(path, { upsert: false });
    if (uploadError || !data) throw new Error("sign");
    return { attemptId: id, signedUrl: data.signedUrl };
  } catch {
    if (attemptId) await failPracticeUpload(attemptId);
    return failure("START_PREPARE_FAILED", "We could not prepare practice. Check your Learner account and connection, then retry.");
  }
}

// Keep failed uploads explicitly incomplete and discoverable even if Storage or
// the connection is unavailable. The learner can discard them or start again.
export async function failPracticeUpload(input: unknown): Promise<Result> {
  const parsed = z.uuid().safeParse(input);
  if (!parsed.success) return failure("FAIL_INVALID_ID");
  try {
    const { supabase, user, attempt } = await ownedAttempt(parsed.data);
    if (attempt.status === "submitted") return { success: true };
    const { error } = await supabase.from("practice_attempts").update({ status: "failed" })
      .eq("id", attempt.id).eq("learner_id", user.id).eq("status", "uploading");
    if (error) return failure("FAIL_ROW_UPDATE_FAILED");
    revalidatePath("/practice");
    return { success: true };
  } catch { return failure("FAIL_CONTEXT_FAILED"); }
}

export async function finishPracticeUpload(input: unknown): Promise<Result> {
  const parsed = practiceFinishSchema.safeParse(input);
  if (!parsed.success) {
    const id = z.object({ attemptId: z.uuid() }).safeParse(input);
    if (id.success) await failPracticeUpload(id.data.attemptId);
    return failure("CONFIRM_INVALID_INPUT", "Use a video longer than 0 and no more than 60 seconds.");
  }
  let reasonCode = "CONFIRM_CONTEXT_FAILED";
  try {
    const { supabase, user, attempt } = await ownedAttempt(parsed.data.attemptId);
    if (attempt.status === "submitted") return { success: true };
    if (attempt.status !== "uploading") return failure("CONFIRM_NOT_PENDING");
    reasonCode = "CONFIRM_OBJECT_LOOKUP_FAILED";
    const { data: object, error } = await supabase.storage.from(PRACTICE_BUCKET).info(attempt.video_path);
    if (error || !object) reasonCode = error ? "CONFIRM_OBJECT_LOOKUP_FAILED" : "CONFIRM_OBJECT_NOT_FOUND";
    else {
      const invalid = checkVideoObject(object, { size: attempt.expected_size_bytes, type: attempt.expected_content_type });
      if (invalid) reasonCode = invalid;
      else {
        reasonCode = "CONFIRM_ROW_UPDATE_FAILED";
        const { data, error: saveError } = await supabase.from("practice_attempts").update({
          status: "submitted", video_size_bytes: object.size, duration_seconds: parsed.data.duration,
        }).eq("id", attempt.id).eq("learner_id", user.id).eq("status", "uploading").select("id").maybeSingle();
        if (!saveError && data) {
          revalidatePath("/practice");
          return { success: true };
        }
      }
    }
  } catch (cause) {
    if (cause instanceof PracticeAccessError) reasonCode = cause.reasonCode;
    // Return fixed codes, never SDK errors, paths or credentials.
  }
  const cleanup = await failPracticeUpload(parsed.data.attemptId);
  return failure(reasonCode, cleanup.error
    ? "Confirmation failed. We could not mark the upload incomplete. Retry or discard it when your connection returns."
    : "Confirmation failed. This attempt is incomplete. Retry the upload or discard it.");
}

export async function discardPracticeUpload(input: unknown): Promise<Result> {
  const parsed = z.uuid().safeParse(input);
  if (!parsed.success) return failure("DISCARD_INVALID_ID");
  try {
    const { supabase, user, attempt } = await ownedAttempt(parsed.data);
    const { data, error } = await supabase.from("practice_attempts").delete()
      .eq("id", attempt.id).eq("learner_id", user.id).neq("status", "submitted").select("id").maybeSingle();
    if (error || !data) return failure("DISCARD_ROW_FAILED", "This attempt may already be saved. Open My practice to check.");
    const { error: removeError } = await supabase.storage.from(PRACTICE_BUCKET).remove([attempt.video_path]);
    revalidatePath("/practice");
    if (removeError) return failure("DISCARD_FILE_FAILED", "Attempt discarded. Its private file may need manual cleanup by the project team.");
    return { success: true };
  } catch { return failure("DISCARD_CONTEXT_FAILED"); }
}
