"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p role="alert">We could not load this page. Please try again.</p>
      <button
        className="bg-slate-900 font-bold text-white hover:bg-slate-700"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
