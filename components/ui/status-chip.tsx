import { CircleCheck, Clock3, Info } from "lucide-react";
import type { ReactNode } from "react";

export function StatusChip({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "time" }) {
  const Icon = tone === "success" ? CircleCheck : tone === "time" ? Clock3 : Info;
  return <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${tone === "time" ? "bg-highlight text-highlight-ink" : tone === "success" ? "bg-success-soft text-success" : "bg-soft text-primary"}`}><Icon size={16} aria-hidden="true" className="shrink-0" />{children}</span>;
}
