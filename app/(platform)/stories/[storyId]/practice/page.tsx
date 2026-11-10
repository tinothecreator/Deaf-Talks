import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth/session";
import { practiceSelectionSchema } from "@/lib/practice/validation";
import { loadStoryPlayback } from "@/lib/stories/playback";
import { CreditAndTerms } from "@/components/stories/credit-and-terms";
import { StoryPlayer } from "@/components/stories/player";
import { PracticeForm } from "@/components/practice/form";

export default async function PracticeSign({ params, searchParams }: {
  params: Promise<{ storyId: string }>; searchParams: Promise<{ sign?: string | string[] }>;
}) {
  const { profile } = await requireAccount();
  const parsed = practiceSelectionSchema.safeParse({ ...await params, ...await searchParams });
  if (!parsed.success) notFound();
  const playback = await loadStoryPlayback(parsed.data.storyId);
  if (!playback) notFound();
  const { story, signedUrl } = playback;
  const sign = story.signs.find(value => value.id === parsed.data.sign);
  if (!sign) notFound();
  return <article className="max-w-2xl space-y-6">
    <Link href={`/stories/${story.id}`} className="tap-link underline">Back to story</Link>
    <h1 className="text-3xl font-bold">Practise: {story.title}</h1>
    <CreditAndTerms storyteller={story.storyteller.display_name} credit={story.ownership_settings.credit_line} usage={story.ownership_settings.usage} />
    <StoryPlayer title={story.title} signedUrl={signedUrl} signs={[sign]}>
      <section id="english-caption" className="rounded border border-slate-500 bg-white p-4"><h2 className="text-xl font-bold">English caption</h2><p className="whitespace-pre-wrap">{story.caption_en}</p></section>
    </StoryPlayer>
    {profile.role === "learner" ? <section className="space-y-4"><h2 className="text-2xl font-bold">Your practice attempt: {sign.label}</h2>
      <p>Your video and caption are private to you, this story’s storyteller, and teachers.</p>
      <PracticeForm storyId={story.id} signId={sign.id} /></section>
      : <p>Only Learner accounts can submit practice attempts. You can watch the sign above.</p>}
  </article>;
}
