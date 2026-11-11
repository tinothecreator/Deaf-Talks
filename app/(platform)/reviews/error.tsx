"use client";
import { Notice } from "@/components/ui/notice";
export default function ReviewsError({ reset }: { reset: () => void }) {
  return <div className="max-w-xl space-y-5"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Reviews unavailable</h1>
    <Notice tone="error">We could not load this review or its feedback. Please try again.</Notice>
    <button className="ui-button ui-button-primary" onClick={reset}>Try again</button>
  </div>;
}
