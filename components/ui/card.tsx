import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card border border-line/40 bg-surface p-5 shadow-[0_3px_16px_#20343005] sm:p-6 ${className}`} {...props} />;
}
