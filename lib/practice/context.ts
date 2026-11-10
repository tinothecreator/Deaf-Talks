import "server-only";
import { getCurrentAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export class PracticeAccessError extends Error {
  constructor(public readonly reasonCode: "CONFIRM_ROLE_REQUIRED" | "CONFIRM_ATTEMPT_LOOKUP_FAILED" | "CONFIRM_PATH_MISMATCH") {
    super("This practice attempt is unavailable.");
  }
}

export async function learnerContext() {
  const { user, profile } = await getCurrentAccount();
  if (!user || profile?.role !== "learner") throw new PracticeAccessError("CONFIRM_ROLE_REQUIRED");
  return { user, supabase: await createClient() };
}

export async function ownedAttempt(id: string) {
  const context = await learnerContext();
  const { data, error } = await context.supabase.from("practice_attempts")
    .select("id, video_path, status, expected_size_bytes, expected_content_type")
    .eq("id", id).eq("learner_id", context.user.id).maybeSingle();
  if (error || !data) throw new PracticeAccessError("CONFIRM_ATTEMPT_LOOKUP_FAILED");
  // Server-created paths have one folder and one random filename.
  if (!new RegExp(`^${context.user.id}/[0-9a-f-]{36}\\.(mp4|webm|mov)$`).test(data.video_path)) {
    throw new PracticeAccessError("CONFIRM_PATH_MISMATCH");
  }
  return { ...context, attempt: data };
}
