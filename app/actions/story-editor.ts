"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { storytellerContext } from "@/lib/media/stories";
import { editorSchema, type EditorResult } from "@/lib/stories/validation";

function refresh(id: string) {
  revalidatePath("/studio");
  revalidatePath(`/studio/${id}`);
  revalidatePath(`/studio/${id}/edit`);
}

export async function saveStoryEditor(input: unknown): Promise<EditorResult> {
  const parsed = editorSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const { user, supabase } = await storytellerContext();
    const value = parsed.data;
    const { data: story, error: readError } = await supabase.from("stories")
      .select("duration_seconds").eq("id", value.storyId).eq("storyteller_id", user.id).maybeSingle();
    if (readError || !story) return { error: "Your story is unavailable. Reload and try again." };
    if (!story.duration_seconds) return { error: "Complete the video upload before editing." };
    if (value.signs.some(sign => sign.start_seconds > story.duration_seconds)) {
      return { error: "Sign timestamps must be within the stored video duration." };
    }
    const { error } = await supabase.rpc("save_story_editor", {
      p_story_id: value.storyId, p_title: value.title, p_caption: value.caption,
      p_credit: value.credit, p_usage: value.usage, p_consent: value.consent, p_signs: value.signs,
    });
    if (error) return { error: "We could not save your changes. Reload and try again. Check that each sign belongs to this story." };
    refresh(value.storyId);
    return { success: "Saved as a draft. Only you can see this story. Publish when you are ready." };
  } catch { return { error: "We could not save your changes. Check your connection and try again." }; }
}

// Only known publication validation messages may leave the server.
const publicationMessages = new Set([
  "Enter an English caption before publishing.", "Enter a credit line before publishing.",
  "Complete a video upload with a duration of 1 to 60 seconds.",
  "Confirm consent before publishing.", "Choose a usage other than Private before publishing.",
  "Add 3 to 5 signs before publishing.",
  "Each sign needs a label, meaning, and timestamp within the stored video duration.",
]);

export async function changeStoryPublication(input: unknown, publish: boolean): Promise<EditorResult> {
  const id = z.uuid().safeParse(input);
  if (!id.success || typeof publish !== "boolean") return { error: "Invalid story or action." };
  try {
    const { supabase } = await storytellerContext();
    const { error } = await supabase.rpc(publish ? "publish_story" : "withdraw_story", { p_story_id: id.data });
    if (error) return { error: publicationMessages.has(error.message) ? error.message : "We could not change publication. Reload and try again with your own story." };
    refresh(id.data);
    return { success: publish ? "Published. Signed-in users can now see this story." : "Withdrawn. This is now a private draft. Only you can see it." };
  } catch { return { error: "We could not change publication. Check your connection and try again." }; }
}
