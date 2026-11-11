"use client";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Star, ThumbsUp, RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { submitFeedback } from "@/app/actions/feedback";
import { ratingLabels } from "@/lib/feedback/validation";

export function FeedbackForm({ attemptId }: { attemptId: string }) {
  const [state, action, pending] = useActionState(submitFeedback, {});
  return <Card className="space-y-4" aria-labelledby="feedback-form-heading">
    <h2 id="feedback-form-heading" className="text-2xl font-semibold">Give feedback</h2>
    <p>Feedback comes from a person, not from AI. Comments cannot be edited or deleted. You can add another review.</p>
    <form action={action} className="space-y-4">
      <input type="hidden" name="attemptId" value={attemptId} />
      <label className="block space-y-2"><span className="font-bold">Written comment (required)</span>
        <textarea name="comment" required maxLength={2000} rows={5} className="auth-input" aria-describedby="comment-limit" /></label>
      <p id="comment-limit">Up to 2,000 characters. Describe what went well and what to practise.</p>
      <fieldset className="min-w-0 space-y-3"><legend className="mb-3 font-semibold">Rating (required)</legend>
        {Object.entries(ratingLabels).map(([value, label]) => { const Icon = value === "excellent" ? Star : value === "good" ? ThumbsUp : RefreshCw; return <label key={value} className="role-option flex min-h-16 cursor-pointer items-center gap-3 rounded-control border border-line p-4"><input type="radio" name="rating" required value={value} className="size-5 shrink-0 accent-primary" /><Icon size={22} aria-hidden="true" className="shrink-0 text-primary" /><span className="font-semibold">{label}</span></label>; })}
      </fieldset>
      <button disabled={pending} className="ui-button ui-button-primary disabled:opacity-60" type="submit">{pending ? "Sending feedback…" : "Send feedback"}</button>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.success && <Notice tone="success">Feedback saved. It is listed below and visible to the learner.</Notice>}
    </form>
  </Card>;
}
