import { CircleCheck, CircleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";

export function Notice({ children, tone = "info", id }: { children: ReactNode; tone?: "info" | "success" | "error"; id?: string }) {
  const Icon = tone === "error" ? CircleAlert : tone === "success" ? CircleCheck : Info;
  const colors = { info: "border-primary bg-soft text-primary", success: "border-success bg-success-soft text-success", error: "border-error bg-error-soft text-error" };
  return <div id={id} role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-control border p-4 ${colors[tone]}`}><Icon size={20} aria-hidden="true" className="mt-0.5 shrink-0" /><div className="min-w-0">{children}</div></div>;
}
