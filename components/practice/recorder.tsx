"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MAX_VIDEO_SECONDS } from "@/lib/media/limits";

const subscribe = () => () => {};
const canRecord = () => typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

export function PracticeRecorder({ disabled, onFile, onRecordingChange }: { disabled: boolean; onFile: (file: File) => void; onRecordingChange: (active: boolean) => void }) {
  const supported = useSyncExternalStore(subscribe, canRecord, () => false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("You can always choose a video file below. Recording does not need sound.");
  const live = useRef<HTMLVideoElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  async function start() {
    setOpening(true); onRecordingChange(true);
    try {
      const type = ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
        .find(value => MediaRecorder.isTypeSupported(value));
      if (!type) throw new Error("format");
      const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (!mounted.current) { camera.getTracks().forEach(track => track.stop()); return; }
      stream.current = camera;
      if (live.current) { live.current.srcObject = camera; await live.current.play(); }
      const capture = new MediaRecorder(camera, { mimeType: type });
      recorder.current = capture;
      const chunks: Blob[] = [];
      capture.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      capture.onstop = () => {
        if (timer.current) clearInterval(timer.current);
        camera.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        setRecording(false); onRecordingChange(false);
        const mime = capture.mimeType.split(";")[0];
        const file = new File(chunks, `practice.${mime === "video/mp4" ? "mp4" : "webm"}`, { type: mime });
        onFile(file);
        setMessage("Recording stopped. Check the preview and caption before uploading. Record again to replace it.");
      };
      capture.onerror = () => {
        if (timer.current) clearInterval(timer.current);
        camera.getTracks().forEach(track => track.stop());
        setRecording(false); onRecordingChange(false);
        setMessage("Recording stopped unexpectedly. Check the preview or use Choose video below.");
      };
      capture.start();
      setRecording(true); setSeconds(0); setMessage("Recording. Stops automatically at 60 seconds.");
      const started = performance.now();
      timer.current = setInterval(() => {
        const elapsed = (performance.now() - started) / 1000;
        setSeconds(Math.min(MAX_VIDEO_SECONDS, Math.floor(elapsed)));
        // Stop slightly before the ceiling to allow the browser to finish its last frame.
        if (elapsed >= MAX_VIDEO_SECONDS - 0.5 && capture.state === "recording") capture.stop();
      }, 100);
    } catch {
      stream.current?.getTracks().forEach(track => track.stop());
      onRecordingChange(false);
      setMessage("We could not open the camera. Allow camera access in your browser, or use Choose video below.");
    } finally { if (mounted.current) setOpening(false); }
  }

  return <div className="space-y-3 rounded border border-slate-500 p-4">
    <p role="status">{!supported && "Recording here is unavailable. Use Choose video below to record with your phone camera or select a file. "}{message} {recording && `${seconds} / ${MAX_VIDEO_SECONDS} seconds`}</p>
    <video ref={live} autoPlay muted playsInline aria-label="Live camera preview" className={recording || opening ? "w-full rounded bg-black" : "hidden"} />
    {supported && <button type="button" disabled={disabled || opening} className="border border-slate-700 disabled:opacity-60"
      onClick={() => recording ? recorder.current?.stop() : void start()}>{opening ? "Opening camera…" : recording ? "Stop recording" : "Record / record again"}</button>}
    {recording && <p>Stop recording before uploading or choosing another video.</p>}
  </div>;
}
