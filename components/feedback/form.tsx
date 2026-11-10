"use client";
import { useActionState } from "react";
import { submitFeedback } from "@/app/actions/feedback";
import { ratingLabels } from "@/lib/feedback/validation";

export function FeedbackForm({ attemptId }: { attemptId: string }) {
  const [state, action, pending] = useActionState(submitFeedback, {});
  return <section className="space-y-3" aria-labelledby="feedback-form-heading">
    <h2 id="feedback-form-heading" className="text-2xl font-bold">Give feedback</h2>
    <p>Feedback comes from a person, not from AI. Comments cannot be edited or deleted. You can add another review.</p>
    <form action={action} className="space-y-4">
      <input type="hidden" name="attemptId" value={attemptId} />
      <label className="block space-y-2"><span className="font-bold">Written comment (required)</span>
        <textarea name="comment" required maxLength={2000} rows={5} className="auth-input" aria-describedby="comment-limit" /></label>
      <p id="comment-limit">Up to 2,000 characters. Describe what went well and what to practise.</p>
      <label className="block space-y-2"><span className="font-bold">Rating (required)</span>
        <select name="rating" required defaultValue="" className="auth-input">
          <option value="" disabled>Choose a rating</option>
          {Object.entries(ratingLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      <button disabled={pending} className="bg-slate-900 font-bold text-white disabled:opacity-60" type="submit">{pending ? "Sending feedback…" : "Send feedback"}</button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p role="status">Feedback saved. It is listed below and visible to the learner.</p>}
    </form>
  </section>;
}
