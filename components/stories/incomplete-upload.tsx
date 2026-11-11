"use client";
import { buttonStyles } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelStoryUpload } from "@/app/actions/stories";

export function IncompleteUpload({ storyId }: { storyId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function discard() {
    setBusy(true); setError("");
    try {
      const result = await cancelStoryUpload(storyId);
      if (result.error) setError(result.error);
      else router.refresh();
    } catch { setError("Could not discard this upload. Please try again."); }
    finally { setBusy(false); }
  }
  return <div><p>Upload incomplete. This story cannot play yet.</p>
    <button disabled={busy} onClick={discard} className={buttonStyles("secondary")}>{busy ? "Discarding…" : "Discard incomplete upload"}</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
