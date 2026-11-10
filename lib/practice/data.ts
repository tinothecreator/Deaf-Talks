import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRACTICE_BUCKET, PLAYBACK_URL_SECONDS } from "@/lib/media/limits";

const attemptSchema = z.object({
  id: z.uuid(), story_id: z.uuid(), sign_id: z.uuid().nullable(), learner_id: z.uuid(),
  caption: z.string(), created_at: z.string(), status: z.enum(["uploading", "failed", "submitted"]),
  video_path: z.string(),
  story: z.object({ title: z.string(),
    storyteller: z.object({ display_name: z.string() }),
    ownership_settings: z.object({ credit_line: z.string() }),
  }).nullable(),
  sign: z.object({ label: z.string() }).nullable(),
});
const columns = "id, story_id, sign_id, learner_id, caption, created_at, status, video_path, story:stories!practice_attempts_story_id_fkey(title, storyteller:profiles!stories_storyteller_id_fkey(display_name), ownership_settings(credit_line)), sign:signs!practice_attempts_sign_id_fkey(label)";
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
  const supabase = await createClient();
  // The verified session must read the row before any privileged signing.
  const { data, error } = await supabase.from("practice_attempts").select(columns).eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load this attempt. Please retry.");
  if (!data) return null;
  const attempt = attemptSchema.parse(data);
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
