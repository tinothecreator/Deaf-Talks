"use client";

import { useRef, useState } from "react";
import { formatTime } from "@/lib/media/time";

type Sign = { id: string; label: string; meaning: string; start_seconds: number };

export function StoryPlayer({ title, signedUrl, signs, children }: {
  title: string; signedUrl: string | null; signs: Sign[]; children: React.ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!signedUrl);

  async function jumpTo(sign: Sign) {
    if (!video.current) return;
    try {
      video.current.currentTime = sign.start_seconds;
      await video.current.play();
      setError(null);
    } catch {
      setError("We could not play this sign. Use the video controls to try again, or reload this page.");
    }
  }

  return <div className="space-y-5">
    {signedUrl ? <>
      <video ref={video} controls playsInline controlsList="nodownload" preload="metadata"
        src={signedUrl} aria-label={title} aria-describedby="english-caption"
        className="max-h-[70dvh] w-full rounded bg-black"
        onLoadedMetadata={() => setLoading(false)}
        onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)}
        onError={() => { setLoading(false); setError("We could not load the video. Reload this page to renew playback access and try again."); }} />
      {loading && <p role="status">Loading video…</p>}
      <p>Playback access lasts five minutes. Reload this page if it expires.</p>
    </> : <p role="alert">We could not load the video. Reload this page to try again.</p>}
    {error && <p role="alert">{error}</p>}
    {children}
    <section aria-labelledby="key-signs-heading" className="space-y-3">
      <h2 id="key-signs-heading" className="text-2xl font-bold">Key signs</h2>
      <p>Choose a sign to play the video from its start time.</p>
      {!signs.length ? <p>No key signs are listed.</p> : <ul className="space-y-3">
        {signs.map(sign => <li key={sign.id}>
          <button type="button" disabled={!signedUrl} onClick={() => void jumpTo(sign)}
            className="w-full flex-col items-start gap-2 border border-slate-500 bg-white text-left hover:bg-slate-100 disabled:opacity-60">
            <span className="font-bold">Play sign: {sign.label} · {formatTime(sign.start_seconds)}</span>
            <span>{sign.meaning}</span>
          </button>
        </li>)}
      </ul>}
    </section>
  </div>;
}
