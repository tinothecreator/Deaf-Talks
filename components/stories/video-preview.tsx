"use client";

import { useState } from "react";
import { formatTime } from "@/lib/media/time";

export function VideoPreview({ signedUrl, name, duration }: { signedUrl: string | null; name: string; duration: number | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "S";
  return <div aria-hidden="true" className="relative aspect-video overflow-hidden rounded-card bg-soft">
    <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-soft to-line/30 text-5xl font-bold tracking-tight text-primary">{initials}</div>
    {signedUrl && failedUrl !== signedUrl && <video key={signedUrl} src={`${signedUrl.split("#")[0]}#t=0.1`} muted playsInline preload="metadata" disablePictureInPicture tabIndex={-1} onError={() => setFailedUrl(signedUrl)} className="absolute inset-0 h-full w-full object-cover" />}
    {duration !== null && <span className="absolute right-3 bottom-3 rounded-full bg-surface px-3 py-1 text-sm font-bold text-ink">{formatTime(duration)}</span>}
  </div>;
}
