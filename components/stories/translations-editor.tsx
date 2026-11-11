"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { StatusChip } from "@/components/ui/status-chip";
import { buttonStyles } from "@/components/ui/button";
import { generateTranslation, saveTranslationEdit, approveTranslation, unapproveTranslation, deleteTranslation } from "@/app/actions/translations";
import { languages, type Translation, type TranslationResult, type Language } from "@/lib/translations/validation";

type Props = { storyId: string; rows: Translation[]; available: boolean; loadError: boolean; captionChanged: boolean };
export function TranslationsEditor(props: Props) {
  return <Card className="space-y-5" onChange={event => event.stopPropagation()}>
    <h2 className="text-xl font-semibold">2. Translations</h2>
    <p>AI writes a first draft. You check it and approve it. Learners only see approved text.</p>
    <p>AI receives only the saved English caption. Remove names, email addresses and other personal information from the caption before generating.</p>
    <p>A story has a total limit of 10 generation attempts across both languages. Failed attempts count. You can always edit text yourself.</p>
    {!props.available && <Notice>AI drafts are unavailable. You can still write, save and approve translations.</Notice>}
    {props.captionChanged && <Notice>Save the English caption first. Saving a changed caption resets approval on all translations.</Notice>}
    {props.loadError ? <Notice tone="error">Could not load translations. Reload this page to try again. You can still save the story.</Notice> :
      (Object.keys(languages) as Language[]).map(language => {
        const row = props.rows.find(row => row.language === language);
        return <TranslationFields key={language} {...props} language={language} row={row} />;
      })}
  </Card>;
}
function TranslationFields({ storyId, language, row, available, captionChanged }: Props & { language: Language; row?: Translation }) {
  const router = useRouter();
  const savedText = row?.text ?? "";
  const [previousText, setPreviousText] = useState(savedText);
  const [text, setText] = useState(savedText);
  // Keep notices mounted when approval changes; replace text when a saved row changes.
  if (previousText !== savedText) {
    setPreviousText(savedText);
    setText(savedText);
  }
  const [result, setResult] = useState<TranslationResult>({});
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const dirty = text !== (row?.text ?? "");
  function run(action: () => Promise<TranslationResult>) {
    if (busy.current) return;
    busy.current = true;
    setResult({});
    startTransition(async () => {
      try {
        const response = await action();
        setResult(response);
        router.refresh();
      } catch { setResult({ error: "Could not reach the server. Please try again." }); }
      finally { busy.current = false; }
    });
  }
  return <fieldset disabled={pending || captionChanged} className="min-w-0 space-y-4 rounded-control border border-line p-4" aria-busy={pending}>
    <legend className="px-2 font-bold">{languages[language]}</legend>
    {row ? <StatusChip tone={row.approved_by_storyteller ? "success" : "info"}>{row.approved_by_storyteller ? "Approved" : row.ai_generated ? "AI draft" : "Draft"}</StatusChip> : <p>No translation yet. Generate a draft or write your own text.</p>}
    {available && <>
      <label className="flex items-start gap-3 py-2"><input type="checkbox" checked={privacyConfirmed} onChange={event => setPrivacyConfirmed(event.target.checked)} className="mt-1 size-6 shrink-0" /><span>I checked that the saved English caption contains no names, contact details or other personal information.</span></label>
      <button type="button" className={buttonStyles("secondary")} disabled={!privacyConfirmed || dirty} onClick={() => run(() => generateTranslation(storyId, language, privacyConfirmed))}>Generate draft</button>
      {dirty && <p>Save or clear your changes before generating again.</p>}
    </>}
    <label className="block">{languages[language]} text<textarea lang={language} className="auth-input mt-2" rows={6} maxLength={12000} value={text} onChange={event => setText(event.target.value)} /></label>
    <p className="text-sm">{text.length.toLocaleString()} / 12,000 characters</p>
    {dirty && <p>Save changes before approving. Changes reset approval.</p>}
    <div className="flex flex-wrap gap-3">
      <button type="button" className={buttonStyles("secondary")} disabled={!text.trim() || !dirty} onClick={() => run(() => saveTranslationEdit(storyId, language, text))}>Save changes</button>
      <button type="button" className={buttonStyles("secondary")} disabled={!row || dirty || row.approved_by_storyteller} onClick={() => run(() => approveTranslation(storyId, language, text))}>Approve — learners will see this text</button>
      {row?.approved_by_storyteller && <button type="button" className={buttonStyles("secondary")} onClick={() => run(() => unapproveTranslation(storyId, language))}>Remove approval</button>}
      <button type="button" className={buttonStyles("quiet")} disabled={!row} onClick={() => run(() => deleteTranslation(storyId, language))}>Remove</button>
    </div>
    <div aria-live="polite">{pending && <p role="status">Saving your request…</p>}{result.error && <Notice tone="error">{result.error}</Notice>}{result.success && <Notice tone="success">{result.success}</Notice>}</div>
  </fieldset>;
}
