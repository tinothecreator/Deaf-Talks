"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStoryEditor, changeStoryPublication } from "@/app/actions/story-editor";
import type { EditorInput, EditorResult } from "@/lib/stories/validation";

type Props = { initial: EditorInput; videoUrl: string | null; duration: number; status: "draft" | "published"; revision: string };
const button = "border border-slate-700 bg-white font-bold disabled:opacity-50";

export function StoryEditor(props: Props) {
  const router = useRouter();
  const [result, setResult] = useState<EditorResult>({});
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const visible = props.status === "published" && props.initial.consent && props.initial.usage !== "private";
  function run(action: () => Promise<EditorResult>) {
    setResult({});
    startTransition(async () => {
      try {
        const response = await action();
        setResult(response);
        if (!response.error) { setDirty(false); router.refresh(); }
      } catch { setResult({ error: "We could not reach the server. Please try again." }); }
    });
  }
  return <div className="space-y-6" aria-busy={pending}>
    <p className="rounded border-2 border-slate-700 p-4" role="status">Who can see this story: {visible ? "Signed-in users can see this published story." : "Only you can see this draft."}</p>
    <p>Status: {props.status === "published" ? "Published" : "Draft"}</p>
    <p>Saving edits returns this story to Draft and hides it from others. Review your changes, then publish again.</p>
    <EditorFields key={props.revision} {...props} pending={pending} onDirty={() => setDirty(true)} onSave={value => run(() => saveStoryEditor(value))} />
    <section aria-label="Publishing" className="space-y-4">
      {dirty && <p>Save your changes before publishing. Publishing uses the saved story.</p>}
      <div className="flex flex-wrap gap-3">
        <button className={button} disabled={pending || dirty || props.status === "published"} onClick={() => run(() => changeStoryPublication(props.initial.storyId, true))}>Publish saved story</button>
        <button className={button} disabled={pending} onClick={() => run(() => changeStoryPublication(props.initial.storyId, false))}>Withdraw to private draft</button>
      </div>
      <p>Withdrawing hides this story from others right away. A video link already opened can keep working for up to five minutes.</p>
      {dirty && <p>Withdrawal does not save the edits in this form.</p>}
    </section>
    <div aria-live="polite" className="space-y-2">
      {pending && <p role="status">Saving your request…</p>}
      {result.error && <p role="alert" className="rounded border-2 border-red-800 p-4 text-red-900">{result.error}</p>}
      {result.success && <p role="status" className="rounded border-2 border-teal-800 p-4">{result.success}</p>}
    </div>
  </div>;
}

function EditorFields({ initial, videoUrl, duration, pending, onDirty, onSave }: Props & {
  pending: boolean; onDirty: () => void; onSave: (value: EditorInput) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [signs, setSigns] = useState(initial.signs);
  const [caption, setCaption] = useState(initial.caption);
  const [videoError, setVideoError] = useState(false);
  function updateSign(index: number, changes: Partial<EditorInput["signs"][number]>) {
    setSigns(signs.map((sign, i) => i === index ? { ...sign, ...changes } : sign));
    onDirty();
  }
  return <form onChange={onDirty} onSubmit={event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    onSave({ ...initial, signs, caption, title: String(fields.get("title") ?? ""),
      credit: String(fields.get("credit") ?? ""), usage: fields.get("usage") as EditorInput["usage"],
      consent: fields.get("consent") === "on" });
  }} className="space-y-6">
    <fieldset disabled={pending} className="min-w-0 space-y-5">
      <legend className="text-xl font-bold">Story and sign tags</legend>
      <label className="block">Title<input className="auth-input mt-2" name="title" required maxLength={160} defaultValue={initial.title} /></label>
      <label className="block">English caption<textarea className="auth-input mt-2" name="caption" rows={5} maxLength={10000} value={caption} onChange={event => setCaption(event.target.value)} /></label>
      {videoUrl && !videoError ? <video ref={video} controls playsInline preload="metadata" src={videoUrl} onError={() => setVideoError(true)} aria-label={initial.title} aria-describedby="edit-caption" className="max-h-[65dvh] w-full rounded bg-black" /> : <p role="alert">We could not load the video. Reload this page to try again.</p>}
      <section id="edit-caption" className="rounded border border-slate-500 bg-white p-4"><h2 className="font-bold">English caption</h2><p className="whitespace-pre-wrap">{caption || "Add your English caption above."}</p></section>
      <p>Video duration: {duration} seconds. Playback links last five minutes. Reload if playback expires.</p>
      <p>Add 3 to 5 signs before publishing. Times must be between 0 and {duration} seconds.</p>
      {signs.map((sign, index) => <fieldset key={sign.id ?? `new-${index}`} className="min-w-0 space-y-4 rounded border border-slate-500 p-4">
        <legend className="px-2 font-bold">Sign {index + 1}</legend>
        <label className="block">Sign label<input className="auth-input mt-2" required maxLength={160} value={sign.label} onChange={event => updateSign(index, { label: event.target.value })} /></label>
        <label className="block">English meaning<textarea className="auth-input mt-2" required maxLength={1000} value={sign.meaning} onChange={event => updateSign(index, { meaning: event.target.value })} /></label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-0 flex-1">Start time in seconds<input className="auth-input mt-2" type="number" min={0} max={duration} step="any" required value={Number.isNaN(sign.start_seconds) ? "" : sign.start_seconds} onChange={event => updateSign(index, { start_seconds: event.target.valueAsNumber })} /></label>
          <button type="button" className={button} disabled={!videoUrl || videoError} onClick={() => updateSign(index, { start_seconds: Math.min(duration, Math.round((video.current?.currentTime ?? 0) * 100) / 100) })}>Use current video time</button>
        </div>
        <button type="button" className={button} onClick={() => { setSigns(signs.filter((_, i) => i !== index)); onDirty(); }}>Remove sign {index + 1}</button>
      </fieldset>)}
      <button type="button" className={button} disabled={signs.length >= 5} onClick={() => { setSigns([...signs, { label: "", meaning: "", start_seconds: 0 }]); onDirty(); }}>Add sign ({signs.length}/5)</button>
    </fieldset>
    <fieldset disabled={pending} className="min-w-0 space-y-5 rounded border border-slate-500 p-4">
      <legend className="px-2 text-xl font-bold">Ownership and consent</legend>
      <label className="flex items-start gap-3 py-3"><input name="consent" type="checkbox" defaultChecked={initial.consent} className="mt-1 size-6 shrink-0" /><span>I own this video or have permission to share it. I agree to show it to signed-in users under the usage terms I choose.</span></label>
      <label className="block">Usage<select name="usage" className="auth-input mt-2" defaultValue={initial.usage}>
        <option value="private">Private — only me</option><option value="learning_only">For learning only</option><option value="share_with_credit">May be shared with credit</option>
      </select></label>
      <label className="block">Credit line<input name="credit" className="auth-input mt-2" required maxLength={500} defaultValue={initial.credit} /></label>
      <p>For learning only: ask before other uses. May be shared with credit: include your name and credit line.</p>
      <p>There is no download option. Playback cannot prevent copying.</p>
    </fieldset>
    <button type="submit" className="bg-slate-900 font-bold text-white disabled:opacity-50" disabled={pending}>Save as draft</button>
  </form>;
}
