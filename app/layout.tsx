import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignStories",
  description:
    "A home for Deaf storytellers and people learning South African Sign Language.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
            <nav aria-label="Main navigation">
              <Link className="tap-link underline underline-offset-4" href="/">
                Home
              </Link>
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
