import type { ReactNode } from "react";

export function PageHeader({ title, description, eyebrow }: { title: string; description?: ReactNode; eyebrow?: string }) {
  return <div className="space-y-3">{eyebrow && <p className="text-sm font-semibold tracking-wide text-primary">{eyebrow}</p>}<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>{description && <p className="max-w-2xl text-muted">{description}</p>}</div>;
}
