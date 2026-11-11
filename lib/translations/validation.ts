import { z } from "zod";

export const languages = { zu: "isiZulu", af: "Afrikaans" } as const;
export const languageSchema = z.enum(["zu", "af"]);
// A local contact-detail guard complements the storyteller privacy check. Names
// cannot be reliably identified from arbitrary prose without sending it elsewhere.
export const captionSchema = z.string().trim().min(1, "Save an English caption first.").max(10000)
  .refine(text => !/[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|www\.|(?:\+?\d[\s().-]*){7,}/i.test(text),
    "Remove contact details from the English caption before generating.");
export const translationTextSchema = z.string().trim().min(1, "Enter some translation text.").max(12000, "Keep the translation under 12,000 characters.");
export const translationKeySchema = z.object({ storyId: z.uuid(), language: languageSchema });
export type Language = z.infer<typeof languageSchema>;
export type Translation = { language: Language; text: string; ai_generated: boolean; approved_by_storyteller: boolean };
export type TranslationResult = { error?: string; success?: string };
