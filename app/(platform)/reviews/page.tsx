import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";
import Link from "next/link";
import { requireAccount } from "@/lib/auth/session";
import { listReviewAttempts } from "@/lib/practice/data";

export default async function Reviews() {
  const { profile } = await requireAccount();
  if (profile.role === "learner") return <p>Reviews are for storytellers and teachers. You can read feedback on your attempts in <Link className={buttonStyles("quiet")} href="/practice">My practice</Link>.</p>;
  const attempts = await listReviewAttempts();
  return <section className="mx-auto max-w-3xl space-y-6">
    <PageHeader title="Reviews" />
    <p>Submitted practice attempts you can review. Feedback comes from people.</p>
    <p>The feedback indicator shows only feedback you wrote.</p>
    {!attempts.length ? <EmptyState title="No submitted attempts to review yet." /> : <ul className="space-y-4">
      {attempts.map(attempt => <li key={attempt.id} className="min-w-0"><Card className="space-y-3">
        <h2 className="text-xl font-semibold"><Link className={buttonStyles("quiet")} href={`/reviews/${attempt.id}`}>{attempt.story?.title ?? "Story no longer available"} · {attempt.sign?.label ?? "Sign no longer available"}</Link></h2>
        {attempt.story && <p>Storyteller: {attempt.story.storyteller.display_name} · Credit: {attempt.story.ownership_settings.credit_line}</p>}
        <p>Learner: {attempt.learner?.display_name ?? "Name unavailable"}</p>
        <p className="whitespace-pre-wrap">{attempt.caption}</p>
        <p><time dateTime={attempt.created_at}>{new Date(attempt.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</time> (South Africa)</p>
        <StatusChip tone={attempt.feedback.length ? "success" : "info"}>Your feedback: {attempt.feedback.length ? "Already added" : "Not added yet"}</StatusChip>
      </Card></li>)}
    </ul>}
  </section>;
}
