"use client";

import { Notice } from "@/components/ui/notice";
export default function PracticeError({ reset }: { reset: () => void }) {
  return <div className="max-w-xl space-y-5">
    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Practice unavailable</h1>
    <Notice tone="error">We could not load your practice attempts. Please try again.</Notice>
    <button className="ui-button ui-button-primary" onClick={reset}>Try again</button>
  </div>;
}
