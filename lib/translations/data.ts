import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { languageSchema, type Translation } from "./validation";

const rowsSchema = z.array(z.object({
  language: languageSchema, text: z.string().max(12000).refine(text => !!text.trim()),
  ai_generated: z.boolean(), approved_by_storyteller: z.boolean(),
}));

// Optional translations must never block caption playback or the story editor.
export async function loadTranslations(storyId: string, approvedOnly = false): Promise<{ rows: Translation[]; error: boolean }> {
  try {
    const supabase = await createClient();
    const query = supabase.from("story_translations")
      .select("language, text, ai_generated, approved_by_storyteller").eq("story_id", storyId);
    const result = await (approvedOnly ? query.eq("approved_by_storyteller", true) : query);
    const parsed = rowsSchema.safeParse(result.data);
    if (result.error || !parsed.success) return { rows: [], error: true };
    return { rows: parsed.data, error: false };
  } catch { return { rows: [], error: true }; }
}
