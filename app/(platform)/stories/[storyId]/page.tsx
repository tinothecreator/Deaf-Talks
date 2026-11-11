import { TranslationSwitch } from "@/components/stories/translation-switch";
import { loadTranslations } from "@/lib/translations/data";
import { ArrowLeft } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
  const translations = await loadTranslations(story.id, true);
  return <article className="mx-auto max-w-3xl space-y-6">
    <Link className={buttonStyles("quiet")} href="/stories"><ArrowLeft size={18} aria-hidden="true" />Back to stories</Link>
    <PageHeader title={story.title} />
    <StoryPlayer practiceStoryId={story.id} title={story.title} signedUrl={signedUrl} signs={story.signs}>
      <section id="english-caption" className="rounded-card border border-line/40 bg-surface p-5 sm:p-6">
        <h2 className="text-xl font-semibold">English caption</h2>
        <p className="mt-3 whitespace-pre-wrap leading-relaxed">{story.caption_en}</p>
      </section>
      {translations.error ? <p role="status">Translations could not load. Reload to try again. The English caption is available above.</p> : <TranslationSwitch rows={translations.rows} />}
    </StoryPlayer>
    <CreditAndTerms storyteller={story.storyteller.display_name} credit={story.ownership_settings.credit_line} usage={story.ownership_settings.usage} />
  </article>;
}
