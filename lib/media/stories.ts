import "server-only";
import { getCurrentAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function storytellerContext() {
  const { user, profile, error } = await getCurrentAccount();
  if (!user || profile?.role !== "storyteller") {
    throw new Error(error ?? "Sign in with a Storyteller account to upload and view your stories.");
  }
  return { user, profile, supabase: await createClient() };
}

// Never accept an object path from the browser. Resolve it from an owned row.
export async function ownedStory(storyId: string) {
  const context = await storytellerContext();
  const { data, error } = await context.supabase.from("stories")
    .select("id, video_path, duration_seconds, video_size_bytes")
    .eq("id", storyId).eq("storyteller_id", context.user.id).eq("status", "draft").single();
  if (error || !data || !data.video_path.startsWith(`${context.user.id}/${storyId}/`)) {
    throw new Error("This story is unavailable.");
  }
  return { ...context, story: data };
}
