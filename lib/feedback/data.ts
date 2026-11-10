import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const feedbackRow = z.object({
  id: z.uuid(), comment: z.string(), created_at: z.string(),
  rating: z.enum(["keep_practising", "good", "excellent"]),
  author: z.object({ display_name: z.string(), role: z.enum(["learner", "storyteller", "teacher"]) }),
});
export type FeedbackRow = z.infer<typeof feedbackRow>;

export async function listFeedback(attemptId: string) {
  z.uuid().parse(attemptId);
  const supabase = await createClient();
  // Existing RLS permits only the author and the attempt's learner.
  const { data, error } = await supabase.from("feedback")
    .select("id, comment, rating, created_at, author:profiles!feedback_reviewer_id_fkey(display_name, role)")
    .eq("attempt_id", attemptId).order("created_at", { ascending: false });
  if (error) throw new Error("Could not load feedback. Please retry.");
  return z.array(feedbackRow).parse(data);
}
