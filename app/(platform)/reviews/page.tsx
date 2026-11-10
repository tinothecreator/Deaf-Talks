import Link from "next/link";
import { requireAccount } from "@/lib/auth/session";
import { listReviewAttempts } from "@/lib/practice/data";

export default async function Reviews() {
  const { profile } = await requireAccount();
  if (profile.role === "learner") return <p>Reviews are for storytellers and teachers. You can read feedback on your attempts in <Link className="tap-link underline" href="/practice">My practice</Link>.</p>;
  const attempts = await listReviewAttempts();
  return <section className="max-w-2xl space-y-5">
    <h1 className="text-3xl font-bold">Reviews</h1>
    <p>Submitted practice attempts you can review. Feedback comes from people.</p>
    <p>The feedback indicator shows only feedback you wrote.</p>
    {!attempts.length ? <p>No submitted attempts to review yet.</p> : <ul className="space-y-4">
      {attempts.map(attempt => <li key={attempt.id} className="space-y-2 rounded border border-slate-500 bg-white p-4">
        <h2 className="text-xl font-bold"><Link className="tap-link underline" href={`/reviews/${attempt.id}`}>{attempt.story?.title ?? "Story no longer available"} · {attempt.sign?.label ?? "Sign no longer available"}</Link></h2>
        {attempt.story && <p>Storyteller: {attempt.story.storyteller.display_name} · Credit: {attempt.story.ownership_settings.credit_line}</p>}
        <p>Learner: {attempt.learner?.display_name ?? "Name unavailable"}</p>
        <p className="whitespace-pre-wrap">{attempt.caption}</p>
        <p><time dateTime={attempt.created_at}>{new Date(attempt.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</time> (South Africa)</p>
        <p>Your feedback: {attempt.feedback.length ? "Already added" : "Not added yet"}</p>
      </li>)}
    </ul>}
  </section>;
}
