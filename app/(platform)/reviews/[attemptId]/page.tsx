import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccount } from "@/lib/auth/session";
import { loadAttemptPlayback } from "@/lib/practice/data";
import { loadStoryPlayback } from "@/lib/stories/playback";
import { listFeedback } from "@/lib/feedback/data";
import { PracticePlayback } from "@/components/practice/playback";
import { StoryPlayer } from "@/components/stories/player";
import { CreditAndTerms } from "@/components/stories/credit-and-terms";
import { FeedbackForm } from "@/components/feedback/form";
import { FeedbackList } from "@/components/feedback/list";
import { formatTime } from "@/lib/media/time";

export default async function ReviewAttempt({ params }: { params: Promise<{ attemptId: string }> }) {
  const { profile } = await requireAccount();
  if (profile.role === "learner") return <p>Only storytellers and teachers can review attempts. Read your feedback in <Link className="tap-link underline" href="/practice">My practice</Link>.</p>;
  const parsed = z.object({ attemptId: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const playback = await loadAttemptPlayback(parsed.data.attemptId);
  if (!playback || playback.attempt.status !== "submitted") notFound();
  const { attempt, signedUrl } = playback;
  const [original, feedback] = await Promise.all([loadStoryPlayback(attempt.story_id), listFeedback(attempt.id)]);
  return <article className="max-w-2xl space-y-6">
    <Link className="tap-link underline" href="/reviews">Back to reviews</Link>
    <h1 className="text-3xl font-bold">Review: {attempt.story?.title ?? "Story no longer available"}</h1>
    <p>Learner: {attempt.learner?.display_name ?? "Name unavailable"}</p>
    <PracticePlayback signedUrl={signedUrl} caption={attempt.caption} />
    {attempt.story && <CreditAndTerms storyteller={attempt.story.storyteller.display_name} credit={attempt.story.ownership_settings.credit_line} usage={attempt.story.ownership_settings.usage} />}
    <section className="space-y-3">
      <h2 className="text-2xl font-bold">Sign being practised</h2>
      {attempt.sign ? <><p className="font-bold">{attempt.sign.label} · {attempt.sign.start_seconds === null ? "Start time unavailable" : formatTime(attempt.sign.start_seconds)}</p><p>{attempt.sign.meaning}</p></> : <p>This sign is no longer available.</p>}
      {original ? <details><summary className="cursor-pointer rounded border border-slate-500 p-4 font-bold">Watch the original sign in the story</summary>
        <StoryPlayer title={original.story.title} signedUrl={original.signedUrl} signs={original.story.signs.filter(sign => sign.id === attempt.sign_id)}>
          <section id="english-caption" className="rounded border border-slate-500 bg-white p-4"><h3 className="text-xl font-bold">English caption</h3><p className="whitespace-pre-wrap">{original.story.caption_en}</p></section>
        </StoryPlayer>
      </details> : <p>The original story is not available to your account. Its access settings still apply.</p>}
    </section>
    <FeedbackForm attemptId={attempt.id} />
    <FeedbackList feedback={feedback} reviewer />
  </article>;
}
