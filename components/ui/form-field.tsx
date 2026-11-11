import type { ReactNode } from "react";

// Inputs pass these hint/error IDs through aria-describedby when used.
export function FormField({ id, label, hint, error, children }: { id: string; label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-2 block font-semibold">{label}</label>{children}{hint && <p id={`${id}-help`} className="mt-2 text-sm text-muted">{hint}</p>}{error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm font-semibold text-error">{error}</p>}</div>;
}
