"use client";
export default function ReviewsError({ reset }: { reset: () => void }) {
  return <div className="max-w-xl space-y-5"><h1 className="text-3xl font-bold">Reviews unavailable</h1>
    <p role="alert">We could not load this review or its feedback. Please try again.</p>
    <button className="bg-slate-900 font-bold text-white" onClick={reset}>Try again</button>
  </div>;
}
