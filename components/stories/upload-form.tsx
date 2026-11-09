"use client";

import Link from "next/link";
import { useState } from "react";
import { cancelStoryUpload, finishStoryUpload, startStoryUpload } from "@/app/actions/stories";
import { readVideoDuration, uploadVideo } from "@/lib/media/browser";
import { MAX_VIDEO_BYTES } from "@/lib/media/limits";

export function UploadForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [fileSize, setFileSize] = useState("");
  const [pending, setPending] = useState<{ storyId: string; duration: number } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function confirm(value: { storyId: string; duration: number }) {
    setMessage("Saving your private draft…");
    const result = await finishStoryUpload(value);
    if (result.error) throw new Error(result.error);
    setPending(null);
    setSavedId(value.storyId);
    setMessage("Your story is saved as a private draft. Only you can view it.");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(""); setProgress(0);
    let draft: { storyId: string; duration: number } | null = null;
    let uploaded = false;
    try {
      const file = form.get("video");
      if (!(file instanceof File) || !file.size) throw new Error("Choose a video.");
      setMessage("Checking video size and duration…");
      const duration = await readVideoDuration(file);
      setMessage("Preparing your private draft…");
      const result = await startStoryUpload({ title: form.get("title"), caption: form.get("caption"), type: file.type, size: file.size, duration });
      if (result.error || !result.signedUrl || !result.storyId) throw new Error(result.error ?? "Could not prepare upload.");
      draft = { storyId: result.storyId, duration };
      setPending(draft);
      setMessage("Uploading video. Keep this page open…");
      await uploadVideo(result.signedUrl, file, setProgress);
      uploaded = true;
      await confirm(draft);
    } catch (cause) {
      let cleanupError = "";
      if (draft && !uploaded) {
        try {
          const result = await cancelStoryUpload(draft.storyId);
          if (result.success) setPending(null);
          else cleanupError = ` ${result.error}`;
        } catch { cleanupError = " The incomplete draft is in My stories. Discard it when your connection returns."; }
      }
      setMessage("");
      setError((cause instanceof Error ? cause.message : "Could not upload. Please try again.") + cleanupError);
    } finally { setBusy(false); }
  }

  async function retryOrDiscard(discard: boolean) {
    if (!pending) return;
    setBusy(true); setError("");
    try {
      if (discard) {
        const result = await cancelStoryUpload(pending.storyId);
        if (result.error) throw new Error(result.error);
        setPending(null); setMessage("Incomplete upload discarded. You can try again.");
      } else await confirm(pending);
    } catch (cause) {
      setMessage(""); setError(cause instanceof Error ? cause.message : "Please try again.");
    } finally { setBusy(false); }
  }

  return <div className="space-y-5">
    {!savedId && <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={busy || !!pending} className="min-w-0 space-y-5 disabled:opacity-70">
        <div><label htmlFor="title" className="block font-bold">Title</label><input id="title" name="title" className="auth-input" required maxLength={160} /></div>
        <div><label htmlFor="caption" className="block font-bold">English caption</label><p id="caption-help">Write the story in English. The caption is always shown with your video.</p>
          <textarea id="caption" name="caption" required maxLength={10000} rows={6} className="auth-input" aria-describedby="caption-help" /></div>
        <div><label htmlFor="video" className="block font-bold">Choose video</label>
          <input id="video" name="video" type="file" required accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" aria-describedby="video-help file-size"
            className="w-full min-w-0 rounded border border-slate-600 p-2 file:mr-3 file:min-h-12 file:rounded file:border-0 file:bg-slate-900 file:px-4 file:font-bold file:text-white"
            onChange={(event) => { const file = event.target.files?.[0]; setFileSize(file ? `${file.name}: ${(file.size / 1024 / 1024).toFixed(1)} MB${file.size > MAX_VIDEO_BYTES ? ' — too large' : ''}` : ''); }} />
          <p id="video-help">MP4, MOV or WebM. Up to 60 seconds and 50 MB (52,428,800 bytes).</p><p id="file-size">{fileSize}</p></div>
        <button type="submit" className="w-full bg-slate-900 font-bold text-white">Upload private draft</button>
      </fieldset>
    </form>}
    <div role="status" aria-live="polite"><p>{message}</p>{busy && <><label htmlFor="upload-progress">Upload progress: {progress}%</label><progress id="upload-progress" className="w-full" max={100} value={progress} /></>}</div>
    {error && <p role="alert" className="rounded border border-red-800 bg-red-50 p-4 text-red-950">{error}</p>}
    {pending && !busy && <div className="flex flex-wrap gap-3">
      <button onClick={() => retryOrDiscard(false)} className="border border-slate-700">Retry confirmation</button>
      <button onClick={() => retryOrDiscard(true)} className="border border-slate-700">Discard incomplete upload</button>
    </div>}
    {savedId && <Link className="tap-link border border-teal-800 font-bold underline" href={`/studio/${savedId}`}>Play your story</Link>}
    <Link className="tap-link underline" href="/studio">My stories</Link>
  </div>;
}
