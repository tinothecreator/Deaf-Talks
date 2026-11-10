import { z } from "zod";

export const ratingLabels = {
  keep_practising: "Keep practising",
  good: "Good",
  excellent: "Excellent",
} as const;
export const feedbackSchema = z.object({
  attemptId: z.uuid(),
  comment: z.string().trim().min(1, "Write a comment before sending feedback.")
    .max(2000, "Keep your comment to 2,000 characters or less."),
  rating: z.enum(["keep_practising", "good", "excellent"]),
});
