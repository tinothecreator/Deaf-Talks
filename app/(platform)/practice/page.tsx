import Link from "next/link";
import { requireAccount } from "@/lib/auth/session";
import { listOwnAttempts, statusLabels } from "@/lib/practice/data";

export default async function MyPractice() {
  const { user, profile } = await requireAccount();
  if (profile.role !== "learner") return <p>My practice is for Learner accounts. Choose a story to watch its signs.</p>;
  const attempts = await listOwnAttempts(user.id);
  return <section className="max-w-2xl space-y-5"><h1 className="text-3xl font-bold">My practice</h1>
    <Link className="tap-link underline" href="/stories">Choose a story to practise</Link>
    {!attempts.length ? <p>No practice attempts yet. Open a story and choose “Practise this sign”.</p> : <ul className="space-y-4">
      {attempts.map(attempt => <li key={attempt.id} className="space-y-2 rounded border border-slate-500 bg-white p-4">
        <h2 className="text-xl font-bold"><Link className="tap-link underline" href={`/practice/${attempt.id}`}>{attempt.story?.title ?? "Story no longer available"} · {attempt.sign?.label ?? "Sign no longer available"}</Link></h2>
        {attempt.story && <p>Storyteller: {attempt.story.storyteller.display_name} · Credit: {attempt.story.ownership_settings.credit_line}</p>}
        <p className="whitespace-pre-wrap">{attempt.caption}</p>
        <p><time dateTime={attempt.created_at}>{new Date(attempt.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</time> (South Africa)</p>
        <p>Status: {statusLabels[attempt.status]}</p>
        <p>{attempt.feedback.length ? "Feedback received" : "No feedback received yet"}</p>
      </li>)}
    </ul>}
  </section>;
}
