import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PLAYBACK_URL_SECONDS, STORY_BUCKET } from "@/lib/media/limits";
import { StoryEditor } from "@/components/stories/editor";
import { CreditAndTerms, usageTerms } from "@/components/stories/credit-and-terms";

export default async function EditStory({ params }: { params: Promise<{ storyId: string }> }) {
  const { user, profile } = await requireAccount();
  const { storyId } = await params;
  if (profile.role !== "storyteller" || !z.uuid().safeParse(storyId).success) notFound();
  const supabase = await createClient();
  const { data: story, error } = await supabase.from("stories")
    .select("title, caption_en, status, updated_at, video_path, duration_seconds, ownership_settings(credit_line, usage, consent_confirmed), signs(id, label, meaning, start_seconds)")
    .eq("id", storyId).eq("storyteller_id", user.id).maybeSingle();
  if (error) throw new Error("Could not load your story. Please try again.");
  if (!story) notFound();
  const ownership = Array.isArray(story.ownership_settings) ? story.ownership_settings[0] : story.ownership_settings;
  const usage = (ownership?.usage ?? "private") as keyof typeof usageTerms;
  if (!story.duration_seconds) return <div className="max-w-2xl space-y-4">
    <h1 className="text-3xl font-bold">Complete your upload first</h1>
    <p>Who can see this story: Only you can see this draft.</p>
    <CreditAndTerms storyteller={profile.display_name} credit={ownership?.credit_line ?? profile.display_name} usage={usage} />
    <Link className="tap-link underline" href="/studio">My stories</Link>
  </div>;
  const playback = story.video_path.startsWith(`${user.id}/${storyId}/`)
    ? await supabase.storage.from(STORY_BUCKET).createSignedUrl(story.video_path, PLAYBACK_URL_SECONDS) : null;
  return <article className="max-w-2xl space-y-6">
    <h1 className="text-3xl font-bold">Edit story</h1>
    <CreditAndTerms storyteller={profile.display_name} credit={ownership?.credit_line ?? profile.display_name} usage={usage} />
    <StoryEditor revision={story.updated_at} status={story.status as "draft" | "published"} duration={story.duration_seconds} videoUrl={playback?.data?.signedUrl ?? null} initial={{
      storyId, title: story.title, caption: story.caption_en ?? "", credit: ownership?.credit_line ?? profile.display_name,
      usage, consent: ownership?.consent_confirmed ?? false,
      signs: story.signs.map(sign => ({ ...sign, start_seconds: Number(sign.start_seconds) })),
    }} />
    <Link className="tap-link underline" href={`/studio/${storyId}`}>View saved story</Link>
    <Link className="tap-link underline" href="/studio">My stories</Link>
  </article>;
}
