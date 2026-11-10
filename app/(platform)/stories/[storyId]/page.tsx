import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccount } from "@/lib/auth/session";
import { loadStoryPlayback } from "@/lib/stories/playback";
import { CreditAndTerms } from "@/components/stories/credit-and-terms";
import { StoryPlayer } from "@/components/stories/player";

export default async function WatchStory({ params }: { params: Promise<{ storyId: string }> }) {
  await requireAccount();
  const parsed = z.object({ storyId: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const playback = await loadStoryPlayback(parsed.data.storyId);
  if (!playback) notFound();
  const { story, signedUrl } = playback;
  return <article className="max-w-2xl space-y-6">
    <Link className="tap-link underline" href="/stories">Back to stories</Link>
    <h1 className="text-3xl font-bold">{story.title}</h1>
    <CreditAndTerms storyteller={story.storyteller.display_name} credit={story.ownership_settings.credit_line} usage={story.ownership_settings.usage} />
    <StoryPlayer title={story.title} signedUrl={signedUrl} signs={story.signs}>
      <section id="english-caption" className="rounded border border-slate-500 bg-white p-5">
        <h2 className="text-xl font-bold">English caption</h2>
        <p className="mt-3 whitespace-pre-wrap">{story.caption_en}</p>
      </section>
    </StoryPlayer>
  </article>;
}
