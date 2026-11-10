import { z } from "zod";
import { uploadSchema, durationSchema } from "@/lib/media/validation";

export const captionSchema = z.string().trim().min(1, "Describe your attempt in the caption.")
  .max(2000, "Keep the caption to 2,000 characters or less.");
export const practiceUploadSchema = uploadSchema.omit({ title: true }).extend({
  storyId: z.uuid(), signId: z.uuid(), caption: captionSchema,
});
export const practiceFinishSchema = z.object({ attemptId: z.uuid(), duration: durationSchema });
export const practiceSelectionSchema = z.object({ storyId: z.uuid(), sign: z.uuid() });
