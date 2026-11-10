import type { FeedbackRow } from "@/lib/feedback/data";
import { ratingLabels } from "@/lib/feedback/validation";
import { roleLabels } from "@/lib/auth/validation";

export function FeedbackList({ feedback, reviewer = false }: { feedback: FeedbackRow[]; reviewer?: boolean }) {
  return <section className="space-y-3" aria-labelledby="feedback-heading">
    <h2 id="feedback-heading" className="text-2xl font-bold">{reviewer ? "Your feedback on this attempt" : "Feedback received"}</h2>
    {reviewer && <p>You can see the feedback you wrote. The learner can see all feedback on their own attempt.</p>}
    {!feedback.length ? <p>{reviewer ? "You have not left feedback yet." : "No feedback received yet."}</p> : <ul className="space-y-4">
      {feedback.map(item => <li key={item.id} className="space-y-2 rounded border border-slate-500 bg-white p-4">
        <p className="font-bold">{item.author.display_name} · {roleLabels[item.author.role]}</p>
        <p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</time> (South Africa)</p>
        <p>Rating: {ratingLabels[item.rating]}</p>
        <p className="whitespace-pre-wrap">{item.comment}</p>
      </li>)}
    </ul>}
  </section>;
}
