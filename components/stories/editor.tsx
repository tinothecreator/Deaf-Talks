"use client";

import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { StatusChip } from "@/components/ui/status-chip";
import { buttonStyles } from "@/components/ui/button";
import { CircleCheck, Circle } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStoryEditor, changeStoryPublication } from "@/app/actions/story-editor";
import type { EditorInput, EditorResult } from "@/lib/stories/validation";

type Props = { initial: EditorInput; videoUrl: string | null; duration: number; status: "draft" | "published"; revision: string };
const button = buttonStyles("secondary");

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
    <Notice>Who can see this story: {visible ? "Signed-in users can see this published story." : "Only you can see this draft."}</Notice>
    <StatusChip tone={props.status === "published" ? "success" : "info"}>{props.status === "published" ? "Published" : "Draft"}</StatusChip>
    <ol aria-label="Story editing steps" className="grid grid-cols-2 gap-3 sm:grid-cols-4">{["Caption", "Tag signs", "Credit and consent", "Publish"].map((step, index) => <li key={step} className="flex items-start gap-2 rounded-control border border-line/40 bg-surface p-3 text-sm font-semibold"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-soft text-primary">{index + 1}</span>{step}</li>)}</ol>
    <p>Saving edits returns this story to Draft and hides it from others. Review your changes, then publish again.</p>
    <EditorFields key={props.revision} {...props} pending={pending} onDirty={() => setDirty(true)} onSave={value => run(() => saveStoryEditor(value))} />
    <Card aria-label="Publishing" className="space-y-4">
      <h2 className="text-xl font-semibold">4. Publish</h2>
      <p className="text-sm text-muted">Publish checklist for the saved story. Save changes to update this checklist. The database checks whether publishing is allowed.</p>
      <ul className="space-y-2">{[
        { label: "Caption added", complete: !!props.initial.caption.trim() },
        { label: "3 to 5 signs", complete: props.initial.signs.length >= 3 && props.initial.signs.length <= 5 },
        { label: "Consent confirmed", complete: props.initial.consent },
        { label: "Usage not private", complete: props.initial.usage !== "private" },
        { label: "Credit line set", complete: !!props.initial.credit.trim() },
      ].map(item => { const Icon = item.complete ? CircleCheck : Circle; return <li key={item.label} className="flex items-center gap-2"><Icon size={20} aria-hidden="true" className="shrink-0 text-primary" /><span>{item.label}: {item.complete ? "Ready" : "Needed"}</span></li>; })}</ul>
      {dirty && <p>Save your changes before publishing. Publishing uses the saved story.</p>}
      <div className="flex flex-wrap gap-3">
        <button className={buttonStyles()} disabled={pending || dirty || props.status === "published"} onClick={() => run(() => changeStoryPublication(props.initial.storyId, true))}>Publish saved story</button>
        <button className={button} disabled={pending} onClick={() => run(() => changeStoryPublication(props.initial.storyId, false))}>Withdraw to private draft</button>
      </div>
      <p>Withdrawing hides this story from others right away. A video link already opened can keep working for up to five minutes.</p>
      {dirty && <p>Withdrawal does not save the edits in this form.</p>}
    </Card>
    <div aria-live="polite" className="space-y-2">
      {pending && <p role="status">Saving your request…</p>}
      {result.error && <Notice tone="error">{result.error}</Notice>}
      {result.success && <Notice tone="success">{result.success}</Notice>}
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
      <legend className="sr-only">Story and sign tags</legend>
      <Card className="space-y-5">
      <h2 className="text-xl font-semibold">1. Caption</h2>
      {videoUrl && !videoError ? <video ref={video} controls playsInline preload="metadata" src={videoUrl} onError={() => setVideoError(true)} aria-label={initial.title} aria-describedby="edit-caption" className="max-h-[65dvh] w-full rounded-card bg-black" /> : <p role="alert">We could not load the video. Reload this page to try again.</p>}
      <section id="edit-caption" className="rounded-control border border-line/40 bg-soft p-4"><h2 className="font-bold">English caption</h2><p className="whitespace-pre-wrap">{caption || "Add your English caption below."}</p></section>
      <p>Video duration: {duration} seconds. Playback links last five minutes. Reload if playback expires.</p>
      <label className="block">Title<input className="auth-input mt-2" name="title" required maxLength={160} defaultValue={initial.title} /></label>
      <label className="block">English caption<textarea className="auth-input mt-2" name="caption" rows={5} maxLength={10000} value={caption} onChange={event => setCaption(event.target.value)} /></label>
      </Card>
      <Card className="space-y-5">
      <h2 className="text-xl font-semibold">2. Tag signs</h2>
      <p>Add 3 to 5 signs before publishing. Times must be between 0 and {duration} seconds.</p>
      {signs.map((sign, index) => <fieldset key={sign.id ?? `new-${index}`} className="min-w-0 space-y-4 rounded-control border border-line p-4">
        <legend className="px-2 font-bold">Sign {index + 1}</legend>
        <label className="block">Sign label<input className="auth-input mt-2" required maxLength={160} value={sign.label} onChange={event => updateSign(index, { label: event.target.value })} /></label>
        <label className="block">English meaning<textarea className="auth-input mt-2" required maxLength={1000} value={sign.meaning} onChange={event => updateSign(index, { meaning: event.target.value })} /></label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-0 basis-full sm:flex-1">Start time in seconds<input className="auth-input mt-2" type="number" min={0} max={duration} step="any" required value={Number.isNaN(sign.start_seconds) ? "" : sign.start_seconds} onChange={event => updateSign(index, { start_seconds: event.target.valueAsNumber })} /></label>
          <button type="button" className={button} disabled={!videoUrl || videoError} onClick={() => updateSign(index, { start_seconds: Math.min(duration, Math.round((video.current?.currentTime ?? 0) * 100) / 100) })}>Use current video time</button>
        </div>
        <button type="button" className={button} onClick={() => { setSigns(signs.filter((_, i) => i !== index)); onDirty(); }}>Remove sign {index + 1}</button>
      </fieldset>)}
      <button type="button" className={button} disabled={signs.length >= 5} onClick={() => { setSigns([...signs, { label: "", meaning: "", start_seconds: 0 }]); onDirty(); }}>Add sign ({signs.length}/5)</button>
      </Card>
    </fieldset>
    <Card><fieldset disabled={pending} className="min-w-0 space-y-5">
      <legend className="mb-4 text-xl font-semibold">3. Credit and consent</legend>
      <p className="font-semibold">Ownership and consent</p>
      <label className="flex items-start gap-3 py-3"><input name="consent" type="checkbox" defaultChecked={initial.consent} className="mt-1 size-6 shrink-0" /><span>I own this video or have permission to share it. I agree to show it to signed-in users under the usage terms I choose.</span></label>
      <label className="block">Usage<select name="usage" className="auth-input mt-2" defaultValue={initial.usage}>
        <option value="private">Private — only me</option><option value="learning_only">For learning only</option><option value="share_with_credit">May be shared with credit</option>
      </select></label>
      <label className="block">Credit line<input name="credit" className="auth-input mt-2" required maxLength={500} defaultValue={initial.credit} /></label>
      <p>For learning only: ask before other uses. May be shared with credit: include your name and credit line.</p>
      <p>There is no download option. Playback cannot prevent copying.</p>
    </fieldset></Card>
    <button type="submit" className={buttonStyles("primary", "w-full sm:w-auto")} disabled={pending}>Save as draft</button>
  </form>;
}
