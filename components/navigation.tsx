"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardCheck, LibraryBig, UserRound, Video } from "lucide-react";

type Role = "learner" | "storyteller" | "teacher";
const stories = { href: "/stories", label: "Stories", icon: BookOpen };
const reviews = { href: "/reviews", label: "Reviews", icon: ClipboardCheck };
const account = { href: "/account", label: "Account", icon: UserRound };
const tabs = {
  learner: [stories, { href: "/practice", label: "Practice", icon: Video }, account],
  storyteller: [{ href: "/studio", label: "My stories", icon: LibraryBig }, reviews, account],
  teacher: [reviews, stories, account],
};

export function Navigation({ role }: { role?: Role }) {
  const pathname = usePathname();
  return <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:static md:border-0 md:p-0">
    <ul className="mx-auto flex max-w-lg items-stretch gap-2 md:max-w-none">
      {(role ? tabs[role] : [stories, account]).map(({ href, label, icon: Icon }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return <li key={href} className="min-w-0 flex-1 md:flex-none"><Link href={href} aria-current={current ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-control border-2 px-2 py-2 text-xs md:min-h-12 md:flex-row md:gap-2 md:px-4 md:text-sm ${current ? "border-primary bg-soft font-bold text-primary" : "border-transparent text-muted hover:bg-soft"}`}><Icon size={20} aria-hidden="true" /><span>{label}</span></Link></li>;
      })}
    </ul>
  </nav>;
}
