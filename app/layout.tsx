import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentAccount } from "@/lib/auth/session";
import { roleLabels } from "@/lib/auth/validation";
import { Inter } from "next/font/google";
import { BookOpen } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { buttonStyles } from "@/components/ui/button";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter", fallback: ["Arial", "Helvetica", "sans-serif"] });

// The header and protected pages depend on request cookies, never build-time auth.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SignStories",
  description:
    "A home for Deaf storytellers and people learning South African Sign Language.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const account = await getCurrentAccount();
  return (
    <html lang="en">
      <body className={`${inter.variable} flex min-h-dvh flex-col ${account.user ? "pb-24 md:pb-0" : ""}`}>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <header className="border-b border-line/40 bg-surface">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <Link className="inline-flex min-h-12 items-center gap-2 text-xl font-bold tracking-tight text-primary" href={account.user ? "/home" : "/"}>
              <BookOpen size={25} aria-hidden="true" />SignStories
            </Link>
            {account.user ? <>
              {account.profile ? <span className="hidden text-sm text-muted lg:block">{account.profile.display_name} · {roleLabels[account.profile.role]}</span> : <span role="status">Profile unavailable</span>}
              <Navigation role={account.profile?.role} />
            </> : <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-2">
              <Link className={buttonStyles("quiet", "px-3")} href="/sign-in">Sign in</Link>
              <Link className={buttonStyles("primary", "px-3")} href="/sign-up">Sign up</Link>
            </nav>}
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto min-w-0 w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-12"
        >
          {children}
        </main>
        <footer className="border-t border-line/40 px-5 py-6 text-center text-sm text-muted">
          SignStories · South African Sign Language
        </footer>
      </body>
    </html>
  );
}
