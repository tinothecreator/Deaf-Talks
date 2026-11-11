import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import Link from "next/link";
import { requireAccount } from "@/lib/auth/session";
import { listOwnAttempts, statusLabels } from "@/lib/practice/data";

export default async function MyPractice() {
  const { user, profile } = await requireAccount();
  if (profile.role !== "learner") return <p>My practice is for Learner accounts. Choose a story to watch its signs.</p>;
  const attempts = await listOwnAttempts(user.id);
  return <section className="mx-auto max-w-3xl space-y-6"><PageHeader title="My practice" />
    <Link className={buttonStyles("quiet")} href="/stories">Choose a story to practise</Link>
    {!attempts.length ? <EmptyState title="No practice attempts yet">Open a story and choose “Practise this sign”.</EmptyState> : <ul className="space-y-4">
      {attempts.map(attempt => <li key={attempt.id} className="min-w-0"><Card className="space-y-3">
        <h2 className="text-xl font-semibold"><Link className={buttonStyles("quiet")} href={`/practice/${attempt.id}`}>{attempt.story?.title ?? "Story no longer available"} · {attempt.sign?.label ?? "Sign no longer available"}</Link></h2>
        {attempt.story && <p>Storyteller: {attempt.story.storyteller.display_name} · Credit: {attempt.story.ownership_settings.credit_line}</p>}
        <p className="whitespace-pre-wrap">{attempt.caption}</p>
        <p><time dateTime={attempt.created_at}>{new Date(attempt.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</time> (South Africa)</p>
        <StatusChip tone={attempt.status === "submitted" ? "success" : "info"}>{attempt.status === "submitted" ? "Submitted" : "Incomplete"}</StatusChip>
        {attempt.status !== "submitted" && <p className="text-sm text-muted">{statusLabels[attempt.status]}</p>}
        <p className="flex items-center gap-2 font-semibold text-primary"><MessageSquare size={20} aria-hidden="true" />{attempt.feedback.length ? "Feedback received" : "No feedback received yet"}</p>
      </Card></li>)}
    </ul>}
  </section>;
}
