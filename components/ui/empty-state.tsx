import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "./card";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <Card className="flex flex-col items-center gap-4 py-12 text-center"><span className="rounded-card bg-soft p-4 text-primary"><BookOpen size={28} aria-hidden="true" /></span><h2 className="text-xl font-semibold">{title}</h2>{children && <div className="text-muted">{children}</div>}</Card>;
}
