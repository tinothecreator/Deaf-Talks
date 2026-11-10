import "server-only";

export const usageTerms = {
  private: "Private. Only the storyteller can view this story.",
  learning_only: "For learning only. Ask the storyteller before using this story in another way.",
  share_with_credit: "May be shared with credit. Always include the storyteller’s name and credit line.",
};

export function CreditAndTerms({ storyteller, credit, usage }: {
  storyteller: string; credit: string; usage: keyof typeof usageTerms;
}) {
  return <section aria-label="Credit and usage terms" className="space-y-2 rounded border border-slate-500 bg-white p-5">
    <p>Storyteller: {storyteller}</p>
    <p>Credit: {credit}</p>
    <p>{usageTerms[usage]}</p>
    <p>No download option is provided. Video playback cannot prevent someone from copying a video.</p>
  </section>;
}
