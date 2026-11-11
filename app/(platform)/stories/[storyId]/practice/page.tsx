import { PageHeader } from "@/components/ui/page-header";
import { buttonStyles } from "@/components/ui/button";
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
  return <article className="mx-auto max-w-3xl space-y-6">
    <Link href={`/stories/${story.id}`} className={buttonStyles("quiet")}>Back to story</Link>
    <PageHeader title={`Practise: ${story.title}`} />
    <CreditAndTerms storyteller={story.storyteller.display_name} credit={story.ownership_settings.credit_line} usage={story.ownership_settings.usage} />
    <StoryPlayer title={story.title} signedUrl={signedUrl} signs={[sign]}>
      <section id="english-caption" className="rounded-card border border-line/40 bg-surface p-5 sm:p-6"><h2 className="text-xl font-semibold">English caption</h2><p className="whitespace-pre-wrap">{story.caption_en}</p></section>
    </StoryPlayer>
    {profile.role === "learner" ? <section className="space-y-4"><h2 className="text-2xl font-semibold">Your practice attempt: {sign.label}</h2>
      <p>Your video and caption are private to you, this story’s storyteller, and teachers.</p>
      <PracticeForm storyId={story.id} signId={sign.id} /></section>
      : <p>Only Learner accounts can submit practice attempts. You can watch the sign above.</p>}
  </article>;
}
