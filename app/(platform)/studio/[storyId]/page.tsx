import Link from "next/link";
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
    .select("title, caption_en, video_path, duration_seconds, ownership_settings(credit_line)")
    .eq("id", storyId).eq("storyteller_id", user.id).maybeSingle();
  if (error) throw new Error("Could not load your story.");
  if (!story) notFound();
  const ownership = Array.isArray(story.ownership_settings) ? story.ownership_settings[0] : story.ownership_settings;
  // Both the row owner and generated path must match before issuing a URL.
  const ready = story.duration_seconds && story.video_path.startsWith(`${user.id}/${storyId}/`);
  const playback = ready ? await supabase.storage.from(STORY_BUCKET).createSignedUrl(story.video_path, PLAYBACK_URL_SECONDS) : null;
  return <article className="max-w-2xl space-y-5">
    <h1 className="text-3xl font-bold">{story.title}</h1>
    <p>Storyteller: {profile.display_name}</p><p>Credit: {ownership?.credit_line ?? profile.display_name}</p>
    {playback?.data ? <>
      <video controls playsInline preload="metadata" src={playback.data.signedUrl} aria-label={story.title} aria-describedby="english-caption" className="max-h-[70dvh] w-full rounded bg-black" />
      <p>Playback access lasts five minutes. Reload this page if it expires. {story.duration_seconds} seconds.</p>
    </> : <p role="alert">{ready ? "We could not load the video. Reload this page to try again." : "This upload is incomplete. Return to My stories to discard it and upload again."}</p>}
    <section id="english-caption" className="rounded border border-slate-400 bg-white p-5"><h2 className="text-xl font-bold">English caption</h2><p className="mt-3 whitespace-pre-wrap">{story.caption_en}</p></section>
    <Link className="tap-link underline" href="/studio">My stories</Link>
  </article>;
}
