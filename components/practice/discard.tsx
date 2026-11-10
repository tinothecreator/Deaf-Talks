"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { discardPracticeUpload } from "@/app/actions/practice";

export function DiscardAttempt({ attemptId }: { attemptId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function discard() {
    setBusy(true); setError("");
    try {
      const result = await discardPracticeUpload(attemptId);
      if (result.error) throw new Error(result.error);
      router.push("/practice"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not discard. Please retry."); }
    finally { setBusy(false); }
  }
  return <div><button type="button" disabled={busy} className="border border-slate-700" onClick={() => void discard()}>{busy ? "Discarding…" : "Discard incomplete upload"}</button>{error && <p role="alert">{error}</p>}</div>;
}
