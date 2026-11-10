import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAYBACK_URL_SECONDS, STORY_BUCKET } from "@/lib/media/limits";

const storyCardSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  caption_en: z.string(),
  duration_seconds: z.number().positive(),
  storyteller: z.object({ display_name: z.string() }),
  ownership_settings: z.object({
    credit_line: z.string(),
    usage: z.enum(["private", "learning_only", "share_with_credit"]),
  }),
});

const storyPlaybackSchema = storyCardSchema.extend({
  video_path: z.string().min(1),
  signs: z.array(z.object({
    id: z.uuid(), label: z.string(), meaning: z.string(),
    start_seconds: z.number().finite().nonnegative(),
  })),
});

const cardColumns = "id, title, caption_en, duration_seconds, storyteller:profiles!stories_storyteller_id_fkey(display_name), ownership_settings(credit_line, usage)";

export async function listWatchableStories() {
  const supabase = await createClient();
  // Owners can also read drafts under RLS. This watching list only needs published rows.
  // Consent and usage authorization belong exclusively to the existing RLS policies.
  const { data, error } = await supabase.from("stories").select(cardColumns)
    .eq("status", "published").order("created_at", { ascending: false });
  if (error) throw new Error("Could not load stories.");
  const parsed = z.array(storyCardSchema).safeParse(data);
  if (!parsed.success) throw new Error("Could not load story details.");
  return parsed.data;
}

export async function loadStoryPlayback(storyId: string) {
  const supabase = await createClient();
  // This ordinary session read is the authorization boundary. Never read story
  // data with the admin client, or sign a browser-supplied object path.
  const { data, error } = await supabase.from("stories")
    .select(`${cardColumns}, video_path, signs(id, label, meaning, start_seconds)`)
    .eq("id", storyId).maybeSingle();
  if (error) throw new Error("Could not load the story.");
  if (!data) return null;
  const parsed = storyPlaybackSchema.safeParse(data);
  if (!parsed.success) throw new Error("Could not load story details.");
  const story = parsed.data;
  story.signs.sort((a, b) => a.start_seconds - b.start_seconds);

  let signedUrl: string | null = null;
  try {
    // Storage restricts session signing to owners. The server-only admin helper
    // is used only for signing, and only after the RLS-checked read above.
    const { data: playback, error: signingError } = await createAdminClient()
      .storage.from(STORY_BUCKET).createSignedUrl(story.video_path, PLAYBACK_URL_SECONDS);
    if (!signingError && playback) signedUrl = playback.signedUrl;
  } catch {
    // Keep caption, credit and terms visible even when signing is unavailable.
  }
  return { story, signedUrl };
}
