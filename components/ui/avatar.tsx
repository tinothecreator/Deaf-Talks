export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-card bg-soft font-semibold text-primary ${large ? "h-20 w-20 text-2xl" : "h-12 w-12 text-base"}`}>{initials || "S"}</span>;
}
