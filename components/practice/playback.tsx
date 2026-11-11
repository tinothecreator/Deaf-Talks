"use client";
import { useState } from "react";

export function PracticePlayback({ signedUrl, caption }: { signedUrl: string | null; caption: string }) {
  const [loading, setLoading] = useState(!!signedUrl);
  const [error, setError] = useState("");
  return <div className="space-y-3">
    {signedUrl ? <video controls playsInline controlsList="nodownload" preload="metadata" src={signedUrl}
      className="max-h-[70dvh] w-full rounded-card bg-black" aria-label="Practice attempt" aria-describedby="practice-caption"
      onLoadedMetadata={() => setLoading(false)} onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)}
      onError={() => { setLoading(false); setError("We could not play the video. Reload this page to renew access and try again."); }} />
      : <p role="alert">We could not load the video. Reload this page to try again.</p>}
    <section id="practice-caption" className="rounded-card border border-line/40 bg-surface p-5 sm:p-6"><h2 className="text-xl font-semibold">Practice caption</h2><p className="whitespace-pre-wrap">{caption}</p></section>
    {loading && <p role="status">Loading video…</p>}{error && <p role="alert">{error}</p>}
    <p>Playback access lasts five minutes. Reload this page if it expires.</p>
  </div>;
}
