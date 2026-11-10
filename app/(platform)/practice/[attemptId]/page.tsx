import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccount } from "@/lib/auth/session";
import { loadAttemptPlayback, statusLabels } from "@/lib/practice/data";
import { PracticePlayback } from "@/components/practice/playback";
import { listFeedback } from "@/lib/feedback/data";
import { FeedbackList } from "@/components/feedback/list";
import { DiscardAttempt } from "@/components/practice/discard";

export default async function AttemptDetail({ params }: { params: Promise<{ attemptId: string }> }) {
  const { profile } = await requireAccount();
  if (profile.role !== "learner") return <p>My practice is for Learner accounts.</p>;
  const parsed = z.object({ attemptId: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const playback = await loadAttemptPlayback(parsed.data.attemptId);
  if (!playback) notFound();
  const { attempt, signedUrl } = playback;
  const feedback = await listFeedback(attempt.id);
  return <article className="max-w-2xl space-y-5">
    <Link className="tap-link underline" href="/practice">Back to My practice</Link>
    <h1 className="text-3xl font-bold">{attempt.story?.title ?? "Story no longer available"} · {attempt.sign?.label ?? "Sign no longer available"}</h1>
    {attempt.story && <p>Storyteller: {attempt.story.storyteller.display_name} · Credit: {attempt.story.ownership_settings.credit_line}</p>}
        <p>Status: {statusLabels[attempt.status]}</p>
    <p><time dateTime={attempt.created_at}>{new Date(attempt.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</time> (South Africa)</p>
    {attempt.status === "submitted" ? <PracticePlayback signedUrl={signedUrl} caption={attempt.caption} />
      : <><p className="whitespace-pre-wrap">{attempt.caption}</p><p>This upload is incomplete. Discard it or return to the sign to upload again.</p>
        <DiscardAttempt attemptId={attempt.id} />
        {attempt.sign_id && attempt.story && <Link className="tap-link underline" href={`/stories/${attempt.story_id}/practice?sign=${attempt.sign_id}`}>Try this sign again</Link>}</>}
    <FeedbackList feedback={feedback} />
  </article>;
}
