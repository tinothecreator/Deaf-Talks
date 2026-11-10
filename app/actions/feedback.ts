"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { feedbackSchema } from "@/lib/feedback/validation";

export type FeedbackResult = { error?: string; success?: boolean };
export async function submitFeedback(_previous: FeedbackResult, form: FormData): Promise<FeedbackResult> {
  const { user, profile } = await requireAccount();
  if (profile.role !== "storyteller" && profile.role !== "teacher") {
    return { error: "Only storytellers and teachers can give feedback." };
  }
  const parsed = feedbackSchema.safeParse({
    attemptId: form.get("attemptId"), comment: form.get("comment"), rating: form.get("rating"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const value = parsed.data;
  try {
    const supabase = await createClient();
    // Session RLS is the authorization boundary; never use admin for feedback.
    const { data: attempt, error: readError } = await supabase.from("practice_attempts")
      .select("id, status").eq("id", value.attemptId).maybeSingle();
    if (readError || !attempt || attempt.status !== "submitted") {
      return { error: "This submitted attempt is unavailable for review." };
    }
    const { error } = await supabase.from("feedback").insert({
      attempt_id: attempt.id, reviewer_id: user.id, comment: value.comment, rating: value.rating,
    });
    if (error) return { error: "We could not save your feedback. Check your access and try again." };
  } catch { return { error: "We could not save your feedback. Please try again." }; }
  revalidatePath("/reviews");
  revalidatePath(`/reviews/${value.attemptId}`);
  revalidatePath("/practice");
  revalidatePath(`/practice/${value.attemptId}`);
  return { success: true };
}
