"use client";

import { useState } from "react";
import { languages, type Translation, type Language } from "@/lib/translations/validation";

export function TranslationSwitch({ rows }: { rows: Translation[] }) {
  const [language, setLanguage] = useState<Language | "en">("en");
  const approved = rows.filter(row => row.approved_by_storyteller);
  if (!approved.length) return null;
  const selected = approved.find(row => row.language === language);
  return <section className="rounded-card border border-line/40 bg-surface p-5 sm:p-6">
    <label className="block font-semibold">Caption language<select className="auth-input mt-2" value={language} onChange={event => setLanguage(event.target.value as Language | "en")}>
      <option value="en">English</option>
      {approved.map(row => <option key={row.language} value={row.language}>{languages[row.language]}</option>)}
    </select></label>
    <div aria-live="polite">{selected && <>
      <p className="mt-4 text-sm font-semibold">{selected.ai_generated ? "Translated with AI and approved by the storyteller." : "Translated and approved by the storyteller."}</p>
      <p lang={selected.language} className="mt-3 whitespace-pre-wrap leading-relaxed">{selected.text}</p>
    </>}</div>
  </section>;
}
