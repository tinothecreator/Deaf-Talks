"use server";

import { revalidatePath } from "next/cache";
import { storytellerContext } from "@/lib/media/stories";
import { translateCaption } from "@/lib/ai/translate";
import { captionSchema, translationKeySchema, translationTextSchema, type TranslationResult } from "@/lib/translations/validation";

const inFlight = new Set<string>();
const unavailable = { error: "This story is unavailable. Sign in as its storyteller and try again." };
function refresh(storyId: string) {
  revalidatePath(`/studio/${storyId}/edit`);
  revalidatePath(`/stories/${storyId}`);
}
async function context(storyId: string) {
  const ctx = await storytellerContext();
  const { data, error } = await ctx.supabase.from("stories").select("id, caption_en")
    .eq("id", storyId).eq("storyteller_id", ctx.user.id).maybeSingle();
  if (error || !data) return null;
  return { ...ctx, story: data };
}

export async function generateTranslation(storyId: unknown, language: unknown, privacyConfirmed: unknown = false): Promise<TranslationResult> {
  const parsed = translationKeySchema.safeParse({ storyId, language });
  if (!parsed.success) return { error: "Choose a valid story and language." };
  if (privacyConfirmed !== true) return { error: "Check that the saved caption contains no personal information before generating." };
  const key = `${parsed.data.storyId}:${parsed.data.language}`;
  if (inFlight.has(key)) return { error: "A draft is already being generated. Please wait." };
  inFlight.add(key);
  let release: (() => Promise<void>) | undefined;
  try {
    const ctx = await context(parsed.data.storyId);
    if (!ctx) return unavailable;
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) return { error: "AI drafts are unavailable. You can still write, save and approve text." };
    if (!captionSchema.safeParse(ctx.story.caption_en).success) return { error: "Save an English caption first (at most 10,000 characters)." };
    const { data, error } = await ctx.supabase.rpc("reserve_translation", {
      p_story_id: parsed.data.storyId, p_language: parsed.data.language,
    });
    if (error || !data?.[0]) return { error: "Could not start a draft. A request may be in progress or this story has reached its limit of 10 generation attempts. Wait a minute and try again, or write your own text." };
    const { reservation, caption } = data[0] as { reservation: string; caption: string };
    release = async () => {
      await ctx.supabase.rpc("finish_translation", { p_story_id: parsed.data.storyId, p_language: parsed.data.language, p_token: reservation, p_text: null });
    };
    // Reject known account identifiers locally. Never include them in an AI request.
    const identifiers = [ctx.profile.display_name, ctx.user.email].filter((value): value is string => !!value?.trim());
    if (identifiers.some(value => caption.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()))) {
      return { error: "Remove names and personal information from the English caption before generating." };
    }
    const result = await translateCaption(caption, parsed.data.language);
    if (!result.ok) return { error: result.error };
    const saved = await ctx.supabase.rpc("finish_translation", {
      p_story_id: parsed.data.storyId, p_language: parsed.data.language, p_token: reservation, p_text: result.text,
    });
    if (saved.error) return { error: "Could not save the draft. The story may have changed. Reload and try again." };
    release = undefined;
    return { success: "AI draft saved. Check the text before approving it." };
  } catch { return { error: "Could not generate a draft. Please try again or enter your own text." }; }
  finally {
    try { await release?.(); } catch { /* Lease expires after 60 seconds. No raw errors are logged. */ }
    inFlight.delete(key);
    refresh(parsed.data.storyId);
  }
}

async function mutate(storyId: unknown, language: unknown, operation: "save" | "approve" | "unapprove" | "delete", text?: unknown): Promise<TranslationResult> {
  const parsed = translationKeySchema.safeParse({ storyId, language });
  if (!parsed.success) return { error: "Choose a valid story and language." };
  const value = operation === "save" || operation === "approve" ? translationTextSchema.safeParse(text) : null;
  if (value && !value.success) return { error: value.error.issues[0].message };
  try {
    const ctx = await context(parsed.data.storyId);
    if (!ctx) return unavailable;
    const table = ctx.supabase.from("story_translations");
    let error;
    if (operation === "save") {
      // Preserve provenance. The DB trigger also prevents clearing true on update.
      const previous = await table.select("ai_generated").eq("story_id", parsed.data.storyId).eq("language", parsed.data.language).maybeSingle();
      if (previous.error) return { error: "Could not load the draft. Reload and try again." };
      ({ error } = await ctx.supabase.from("story_translations").upsert({
        story_id: parsed.data.storyId, language: parsed.data.language, text: value!.data,
        ai_generated: previous.data?.ai_generated ?? false, approved_by_storyteller: false,
      }, { onConflict: "story_id,language" }));
    } else {
      const query = operation === "delete" ? table.delete() : table.update({ approved_by_storyteller: operation === "approve" });
      const filtered = query.eq("story_id", parsed.data.storyId).eq("language", parsed.data.language);
      // Never approve unseen text if another tab has edited it.
      const result = await (operation === "approve" ? filtered.eq("text", typeof text === "string" ? text : value!.data) : filtered).select("id");
      error = result.error;
      if (!error && !result.data?.length) return { error: "The draft changed or was removed. Reload, check it and try again." };
    }
    if (error) return { error: "Could not save this translation. Reload and try again." };
    refresh(parsed.data.storyId);
    return { success: operation === "approve" ? "Approved. Learners can see this text when the story is published and shared." : operation === "delete" ? "Translation removed." : operation === "unapprove" ? "Approval removed. Only you can see this draft." : "Draft saved. Check it before approving." };
  } catch { return unavailable; }
}
export async function saveTranslationEdit(storyId: unknown, language: unknown, text: unknown) { return mutate(storyId, language, "save", text); }
export async function approveTranslation(storyId: unknown, language: unknown, text: unknown) { return mutate(storyId, language, "approve", text); }
export async function unapproveTranslation(storyId: unknown, language: unknown) { return mutate(storyId, language, "unapprove"); }
export async function deleteTranslation(storyId: unknown, language: unknown) { return mutate(storyId, language, "delete"); }
