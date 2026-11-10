"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { discardPracticeUpload, finishPracticeUpload, startPracticeUpload, failPracticeUpload } from "@/app/actions/practice";
import { readVideoDuration, uploadVideo } from "@/lib/media/browser";
import { MAX_VIDEO_BYTES } from "@/lib/media/limits";
import { PracticeRecorder } from "./recorder";

export function PracticeForm({ storyId, signId }: { storyId: string; signId: string }) {
  const [recording, setRecording] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const chooseFile = useCallback((value: File) => { setFile(value); setError(""); }, []);

  useEffect(() => {
    if (!file || !preview.current) return;
    const url = URL.createObjectURL(file); preview.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function discard() {
    if (!pending) return;
    setBusy(true); setError("");
    try {
      const result = await discardPracticeUpload(pending);
      if (result.error) throw new Error(result.error);
      setPending(null); setMessage("Incomplete upload discarded. You can try again.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not discard. Try again."); }
    finally { setBusy(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setProgress(0);
    let id: string | null = null;
    try {
      if (recording) throw new Error("Stop recording before uploading.");
      if (pending) {
        const result = await discardPracticeUpload(pending);
        if (result.error) throw new Error(result.error);
        setPending(null);
      }
      if (!caption.trim()) throw new Error("Describe your attempt in the caption.");
      if (!file) throw new Error("Record or choose a video first.");
      setMessage("Checking video size and duration…");
      const duration = await readVideoDuration(file);
      const result = await startPracticeUpload({ storyId, signId, caption, type: file.type, size: file.size, duration });
      if (!("attemptId" in result) || !result.attemptId || !result.signedUrl) throw new Error("error" in result ? result.error : "Could not prepare upload.");
      id = result.attemptId; setPending(id);
      setMessage("Uploading video. Keep this page open…");
      await uploadVideo(result.signedUrl, file, setProgress);
      setMessage("Checking and saving your attempt…");
      const confirmed = await finishPracticeUpload({ attemptId: id, duration });
      if (confirmed.error) throw new Error(`${confirmed.error} (${confirmed.reasonCode})`);
      setSaved(id); setPending(null); setMessage("Your practice attempt is saved.");
    } catch (cause) {
      if (id) {
        try { await failPracticeUpload(id); } catch { /* My practice keeps pending uploads discoverable. */ }
      }
      setMessage(""); setError(cause instanceof Error ? cause.message : "Upload failed. Retry or discard it.");
    } finally { setBusy(false); }
  }

  if (saved) return <div role="status" className="space-y-3"><p>Your practice attempt is saved with its caption.</p>
    <Link className="tap-link underline" href={`/practice/${saved}`}>Play your attempt</Link><Link className="tap-link underline" href="/practice">My practice</Link></div>;
  return <form onSubmit={submit} className="space-y-5">
    <fieldset disabled={busy} className="min-w-0 space-y-5 disabled:opacity-70">
      <div><label htmlFor="attempt-caption" className="block font-bold">Caption: describe your practice attempt</label>
        <p id="attempt-caption-help">Write what you are trying to sign. This caption is always shown beside your video. Maximum 2,000 characters.</p>
        <textarea id="attempt-caption" required maxLength={2000} rows={4} value={caption} onChange={event => setCaption(event.target.value)}
          className="auth-input" aria-describedby="attempt-caption-help" /></div>
      <PracticeRecorder disabled={busy || !!pending} onFile={chooseFile} onRecordingChange={setRecording} />
      <div><label htmlFor="practice-video" className="block font-bold">Choose video or use your phone camera</label>
        <input id="practice-video" type="file" capture="user" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          disabled={!!pending || recording} className="w-full min-w-0 rounded border border-slate-600 p-2 file:min-h-12 file:bg-slate-900 file:p-3 file:text-white"
          aria-describedby="practice-video-help" onChange={event => { const value = event.target.files?.[0]; if (value) chooseFile(value); }} />
        <p id="practice-video-help">MP4, MOV or WebM. Keep your video to 60 seconds or less and no larger than 50 MiB (52,428,800 bytes). Trim it or export at a lower resolution if it is too large.</p>
        {file && <p>{file.name}: {(file.size / 1024 / 1024).toFixed(1)} MiB {file.size > MAX_VIDEO_BYTES && "— too large"}</p>}
      </div>
      {file && <div className="space-y-2"><video ref={preview} controls playsInline aria-label="Your practice preview" aria-describedby="preview-caption"
        className="max-h-96 w-full rounded bg-black" onError={() => setError("We could not preview this video. Try choosing an MP4 video.")} />
        <p id="preview-caption" className="whitespace-pre-wrap">{caption.trim() || "Add a caption describing your attempt before uploading."}</p></div>}
      <button className="w-full bg-slate-900 font-bold text-white" type="submit" disabled={recording}>{pending ? "Retry upload" : "Upload practice attempt"}</button>
    </fieldset>
    <div role="status" aria-live="polite">{message}{busy && <><label htmlFor="practice-progress" className="block">Upload progress: {progress}%</label><progress id="practice-progress" className="w-full" max={100} value={progress} /></>}</div>
    {error && <p role="alert" className="rounded border border-red-800 bg-red-50 p-4 text-red-950">{error}</p>}
    {pending && <button type="button" disabled={busy} className="border border-slate-700" onClick={() => void discard()}>Discard incomplete upload</button>}
  </form>;
}
