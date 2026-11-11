import "server-only";
import { ShieldCheck } from "lucide-react";

export const usageTerms = {
  private: "Private. Only the storyteller can view this story.",
  learning_only: "For learning only. Ask the storyteller before using this story in another way.",
  share_with_credit: "May be shared with credit. Always include the storyteller’s name and credit line.",
};

export function CreditAndTerms({ storyteller, credit, usage }: {
  storyteller: string; credit: string; usage: keyof typeof usageTerms;
}) {
  return <section aria-label="Credit and usage terms" className="space-y-3 rounded-card border border-line/40 bg-surface p-5 sm:p-6">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={20} aria-hidden="true" className="shrink-0 text-primary" />Credit and usage terms</h2>
    <p className="font-semibold">Storyteller: {storyteller}</p>
    <p>Credit: {credit}</p>
    <p>{usageTerms[usage]}</p>
    <p>No download option is provided. Video playback cannot prevent someone from copying a video.</p>
  </section>;
}
