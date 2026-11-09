import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentAccount } from "@/lib/auth/session";
import { roleLabels } from "@/lib/auth/validation";
import { signOut } from "@/app/actions/auth";
import "./globals.css";

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
      <body className="flex min-h-dvh flex-col">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <header className="border-b border-slate-300 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
            <Link className="tap-link text-xl font-bold" href="/">
              SignStories
            </Link>
            <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-2">
              <Link className="tap-link underline underline-offset-4" href="/">
                Home
              </Link>
              {account.user ? <>
                {account.profile ? <span className="px-3">{account.profile.display_name} · {roleLabels[account.profile.role]}</span> : <span role="status">Profile unavailable</span>}
                <Link className="tap-link underline underline-offset-4" href="/account">Account</Link>
                <form action={signOut}><button className="border border-slate-700 font-bold hover:bg-slate-100" type="submit">Sign out</button></form>
              </> : <>
                <Link className="tap-link underline underline-offset-4" href="/sign-in">Sign in</Link>
                <Link className="tap-link underline underline-offset-4" href="/sign-up">Sign up</Link>
              </>}
            </nav>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8 sm:py-20"
        >
          {children}
        </main>
        <footer className="border-t border-slate-300 px-5 py-6 text-center text-sm text-slate-700">
          SignStories · South African Sign Language
        </footer>
      </body>
    </html>
  );
}
