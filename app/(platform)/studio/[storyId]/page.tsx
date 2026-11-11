import { PageHeader } from "@/components/ui/page-header";
import { buttonStyles } from "@/components/ui/button";
import Link from "next/link";
import { CreditAndTerms, usageTerms } from "@/components/stories/credit-and-terms";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PLAYBACK_URL_SECONDS, STORY_BUCKET } from "@/lib/media/limits";

export default async function StoryDetail({ params }: { params: Promise<{ storyId: string }> }) {
  const { user, profile } = await requireAccount();
  const { storyId } = await params;
  if (profile.role !== "storyteller" || !z.uuid().safeParse(storyId).success) notFound();
  const supabase = await createClient();
  const { data: story, error } = await supabase.from("stories")
    .select("title, caption_en, video_path, duration_seconds, ownership_settings(credit_line, usage)")
    .eq("id", storyId).eq("storyteller_id", user.id).maybeSingle();
  if (error) throw new Error("Could not load your story.");
  if (!story) notFound();
  const ownership = Array.isArray(story.ownership_settings) ? story.ownership_settings[0] : story.ownership_settings;
  // Both the row owner and generated path must match before issuing a URL.
  const ready = story.duration_seconds && story.video_path.startsWith(`${user.id}/${storyId}/`);
  const playback = ready ? await supabase.storage.from(STORY_BUCKET).createSignedUrl(story.video_path, PLAYBACK_URL_SECONDS) : null;
  return <article className="mx-auto max-w-3xl space-y-6">
    <PageHeader title={story.title} />
        {playback?.data ? <>
      <video controls playsInline preload="metadata" src={playback.data.signedUrl} aria-label={story.title} aria-describedby="english-caption" className="max-h-[70dvh] w-full rounded-card bg-black" />
      <p>Playback access lasts five minutes. Reload this page if it expires. {story.duration_seconds} seconds.</p>
    </> : <p role="alert">{ready ? "We could not load the video. Reload this page to try again." : "This upload is incomplete. Return to My stories to discard it and upload again."}</p>}
    <section id="english-caption" className="rounded-card border border-line/40 bg-surface p-5 sm:p-6"><h2 className="text-xl font-semibold">English caption</h2><p className="mt-3 whitespace-pre-wrap">{story.caption_en}</p></section>
    <CreditAndTerms storyteller={profile.display_name} credit={ownership?.credit_line ?? profile.display_name} usage={(ownership?.usage ?? "private") as keyof typeof usageTerms} />
    <Link className={buttonStyles("primary")} href={`/studio/${storyId}/edit`}>Edit story</Link>
    <Link className={buttonStyles("quiet")} href="/studio">My stories</Link>
  </article>;
}
