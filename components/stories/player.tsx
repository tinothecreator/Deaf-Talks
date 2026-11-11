"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { StatusChip } from "@/components/ui/status-chip";
import { useRef, useState } from "react";
import { formatTime } from "@/lib/media/time";

type Sign = { id: string; label: string; meaning: string; start_seconds: number };

export function StoryPlayer({ title, signedUrl, signs, children, practiceStoryId }: {
  practiceStoryId?: string; title: string; signedUrl: string | null; signs: Sign[]; children: React.ReactNode;
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
        className="max-h-[70dvh] min-h-48 w-full rounded-card bg-black"
        onLoadedMetadata={() => setLoading(false)}
        onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)}
        onError={() => { setLoading(false); setError("We could not load the video. Reload this page to renew playback access and try again."); }} />
    </> : <Notice tone="error">We could not load the video. Reload this page to try again.</Notice>}
    {children}
    {loading && <Notice>Loading video…</Notice>}
    {signedUrl && <p className="text-sm text-muted">Playback access lasts five minutes. Reload this page if it expires.</p>}
    {error && <Notice tone="error">{error}</Notice>}
    <section aria-labelledby="key-signs-heading" className="space-y-3">
      <h2 id="key-signs-heading" className="text-2xl font-semibold">Key signs</h2>
      <p>Choose a sign to play the video from its start time.</p>
      {!signs.length ? <p>No key signs are listed.</p> : <ul className="space-y-3">
        {signs.map(sign => <li key={sign.id} className="space-y-2 rounded-card border border-line/40 bg-surface p-3 sm:p-4">
          <button type="button" disabled={!signedUrl} onClick={() => void jumpTo(sign)}
            className="w-full flex-col items-start gap-3 bg-highlight/50 text-left hover:bg-highlight disabled:opacity-60">
            <span className="flex w-full flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-lg font-semibold"><Play size={18} aria-hidden="true" className="shrink-0" />Play sign: {sign.label}</span><StatusChip tone="time">{formatTime(sign.start_seconds)}</StatusChip></span>
            <span>{sign.meaning}</span>
          </button>
          {practiceStoryId && <Link className={buttonStyles("primary", "w-full")} href={`/stories/${practiceStoryId}/practice?sign=${sign.id}`}>Practise this sign: {sign.label}<ArrowRight size={18} aria-hidden="true" className="shrink-0" /></Link>}
        </li>)}
      </ul>}
    </section>
  </div>;
}
