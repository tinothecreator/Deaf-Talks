import { z } from "zod";

export const editorSchema = z.object({
  storyId: z.uuid(),
  title: z.string().trim().min(1, "Enter a title.").max(160, "Keep the title under 160 characters."),
  // Incomplete captions and tag sets can be saved privately; publication checks them.
  caption: z.string().trim().max(10000, "Keep the caption under 10,000 characters."),
  credit: z.string().trim().min(1, "Enter a credit line.").max(500, "Keep the credit under 500 characters."),
  usage: z.enum(["private", "learning_only", "share_with_credit"]),
  consent: z.boolean(),
  signs: z.array(z.object({
    id: z.uuid().optional(),
    label: z.string().trim().min(1, "Enter a label for each sign.").max(160),
    meaning: z.string().trim().min(1, "Enter an English meaning for each sign.").max(1000),
    start_seconds: z.number().finite().min(0, "Timestamps must be 0 or more seconds."),
  })).max(5, "Use no more than 5 signs."),
});
export type EditorInput = z.infer<typeof editorSchema>;
export type EditorResult = { error?: string; success?: string };
