import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRACTICE_BUCKET, PLAYBACK_URL_SECONDS } from "@/lib/media/limits";
import { getCurrentAccount } from "@/lib/auth/session";

const attemptSchema = z.object({
  id: z.uuid(), story_id: z.uuid(), sign_id: z.uuid().nullable(), learner_id: z.uuid(),
  caption: z.string(), created_at: z.string(), status: z.enum(["uploading", "failed", "submitted"]),
  video_path: z.string(),
  story: z.object({ title: z.string(),
    storyteller: z.object({ display_name: z.string() }),
    ownership_settings: z.object({ credit_line: z.string(), usage: z.enum(["private", "learning_only", "share_with_credit"]) }),
  }).nullable(),
  sign: z.object({ label: z.string(), meaning: z.string(), start_seconds: z.number().nullable() }).nullable(),
  learner: z.object({ display_name: z.string() }).nullable().optional(),
  feedback: z.array(z.object({ id: z.uuid() })).default([]),
});
const columns = "id, story_id, sign_id, learner_id, caption, created_at, status, video_path, story:stories!practice_attempts_story_id_fkey(title, storyteller:profiles!stories_storyteller_id_fkey(display_name), ownership_settings(credit_line, usage)), sign:signs!practice_attempts_sign_id_fkey(label, meaning, start_seconds), learner:profiles!practice_attempts_learner_id_fkey(display_name), feedback(id)";
export const statusLabels = { uploading: "Upload incomplete", failed: "Upload failed — incomplete", submitted: "Submitted" };

export async function listOwnAttempts(userId: string) {
  const supabase = await createClient();
  // userId comes only from requireAccount, never a request parameter.
  const { data, error } = await supabase.from("practice_attempts").select(columns)
    .eq("learner_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your practice attempts. Please retry.");
  return z.array(attemptSchema).parse(data);
}

export async function loadAttemptPlayback(id: string) {
  z.uuid().parse(id);
  const { user, profile } = await getCurrentAccount();
  if (!user || !profile || !["learner", "storyteller", "teacher"].includes(profile.role)) return null;
  const supabase = await createClient();
  // The verified session must read the row before any privileged signing.
  const { data, error } = await supabase.from("practice_attempts").select(columns).eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load this attempt. Please retry.");
  if (!data) return null;
  const attempt = attemptSchema.parse(data);
  // RLS determines which attempts reviewers may read. Learner playback is own-only.
  if (profile.role === "learner" && attempt.learner_id !== user.id) return null;
  let signedUrl: string | null = null;
  if (attempt.status === "submitted") {
    if (!new RegExp(`^${attempt.learner_id}/[0-9a-f-]{36}\\.(mp4|webm|mov)$`).test(attempt.video_path)) {
      throw new Error("The stored video path is invalid.");
    }
    try {
      const { data: signed, error: signingError } = await createAdminClient().storage.from(PRACTICE_BUCKET)
        .createSignedUrl(attempt.video_path, PLAYBACK_URL_SECONDS);
      if (!signingError && signed) signedUrl = signed.signedUrl;
    } catch { /* Preserve caption and context if signing fails. */ }
  }
  return { attempt, signedUrl };
}

export async function listReviewAttempts() {
  const { user, profile } = await getCurrentAccount();
  if (!user || !profile || !["storyteller", "teacher"].includes(profile.role)) {
    throw new Error("Reviews are for storyteller and teacher accounts.");
  }
  const supabase = await createClient();
  // Do not duplicate can_review_attempt here. The session's RLS filters the queue.
  const { data, error } = await supabase.from("practice_attempts").select(columns)
    .eq("status", "submitted").order("created_at", { ascending: false });
  if (error) throw new Error("Could not load the review queue. Please retry.");
  return z.array(attemptSchema).parse(data);
}
