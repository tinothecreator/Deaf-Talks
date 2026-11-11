import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccount } from "@/lib/auth/session";
import { PLAYBACK_URL_SECONDS, STORY_BUCKET, PRACTICE_BUCKET } from "@/lib/media/limits";

const feedStorySchema = z.object({
  id: z.string(), title: z.string(), caption_en: z.string().nullable().transform(value => value ?? ""), duration_seconds: z.number().nullable(),
  video_path: z.string().nullable(), status: z.string(),
  storyteller: z.object({ display_name: z.string() }),
  ownership_settings: z.object({ credit_line: z.string() }).nullable(),
  signs: z.array(z.object({ id: z.string(), label: z.string(), start_seconds: z.number().nullable().transform(value => value ?? 0) })),
});
export type FeedStory = z.infer<typeof feedStorySchema> & { signedUrl: string | null };
const homePracticeSchema = z.object({
  id: z.string(), learner_id: z.string(), video_path: z.string(), duration_seconds: z.number(), caption: z.string(),
  sign: z.object({ label: z.string() }).nullable(),
});
const homeReviewSchema = z.object({
  id: z.string(), caption: z.string(), learner: z.object({ display_name: z.string() }).nullable(),
});
const storyColumns = "id, title, caption_en, duration_seconds, video_path, status, storyteller:profiles!stories_storyteller_id_fkey(display_name), ownership_settings(credit_line), signs(id, label, start_seconds)";

function parseRows<T>(rows: unknown[], schema: z.ZodType<T>): T[] {
  return rows.flatMap(row => {
    const result = schema.safeParse(row);
    return result.success ? [result.data] : [];
  });
}

// Call only with paths from a completed session read, never browser input.
async function previews<T extends { video_path: string | null }>(rows: T[], bucket: string) {
  const playableRows = rows.filter((row): row is T & { video_path: string } => Boolean(row.video_path?.trim()));
  if (!playableRows.length) return [] as (T & { signedUrl: string | null })[];
  try {
    const { data, error } = await createAdminClient().storage.from(bucket)
      .createSignedUrls(playableRows.map(row => row.video_path), PLAYBACK_URL_SECONDS);
    return playableRows.map(row => ({ ...row, signedUrl: error ? null :
      data?.find(item => item.path === row.video_path && !item.error)?.signedUrl ?? null }));
  } catch {
    return playableRows.map(row => ({ ...row, signedUrl: null }));
  }
}

export async function listFeedStories(limit = 12, own = false): Promise<FeedStory[]> {
  const { user, profile } = await requireAccount();
  if (own && profile.role !== "storyteller") return [];
  const session = await createClient();
  let query = session.from("stories").select(storyColumns);
  query = own ? query.eq("storyteller_id", user.id) : query.eq("status", "published");
  const { data, error } = await query.order("created_at", { ascending: false }).limit(Math.min(12, Math.max(1, limit)));
  if (error) throw new Error("Could not load stories. Please retry.");
  return previews(parseRows(data ?? [], feedStorySchema), STORY_BUCKET);
}

export async function listHomePractice() {
  const { user, profile } = await requireAccount();
  if (profile.role !== "learner") return [];
  const session = await createClient();
  const { data, error } = await session.from("practice_attempts")
    .select("id, learner_id, video_path, duration_seconds, caption, sign:signs!practice_attempts_sign_id_fkey(label)")
    .eq("learner_id", user.id).eq("status", "submitted")
    .order("created_at", { ascending: false }).limit(8);
  if (error) throw new Error("Could not load your practice. Please retry.");
  // Keep own-only even if a reviewer-capable policy changes in the future.
  return previews(parseRows(data ?? [], homePracticeSchema).filter(row => row.learner_id === user.id), PRACTICE_BUCKET);
}

export async function homeReviews() {
  const { profile } = await requireAccount();
  if (profile.role === "learner") return { count: 0, attempts: [] };
  const session = await createClient();
  // feedback RLS exposes this reviewer's feedback; the anti-join selects their remaining queue.
  const { data, count, error } = await session.from("practice_attempts")
    .select("id, caption, learner:profiles!practice_attempts_learner_id_fkey(display_name), feedback!left(id)", { count: "exact" })
    .eq("status", "submitted").is("feedback", null)
    .order("created_at", { ascending: false }).limit(3);
  if (error) throw new Error("Could not load reviews. Please retry.");
  return { count: count ?? 0, attempts: parseRows(data ?? [], homeReviewSchema) };
}
