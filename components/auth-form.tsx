"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";
  const [state, action, pending] = useActionState<AuthState, FormData>(isSignUp ? signUp : signIn, {});
  return (
    <form action={action} className="space-y-5" aria-busy={pending}>
      {state.error && <p id="auth-error" role="alert" className="rounded border-2 border-red-800 bg-red-50 p-4 text-red-950"><strong>Error:</strong> {state.error}</p>}
      {state.message && <p role="status" className="rounded border-2 border-teal-800 bg-teal-50 p-4">{state.message}</p>}
      <fieldset disabled={pending} aria-describedby={state.error ? "auth-error" : undefined} className="space-y-5 disabled:opacity-70">
        <legend className="sr-only">{isSignUp ? "Create your account" : "Sign in to your account"}</legend>
        {isSignUp && <div>
          <label htmlFor="display_name" className="mb-2 block font-bold">Display name</label>
          <input id="display_name" name="display_name" autoComplete="nickname" required maxLength={80} className="auth-input" />
        </div>}
        <div>
          <label htmlFor="email" className="mb-2 block font-bold">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className="auth-input" />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block font-bold">Password</label>
          <input id="password" name="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} required minLength={isSignUp ? 8 : 1} maxLength={128} aria-describedby={isSignUp ? "password-help" : undefined} className="auth-input" />
          {isSignUp && <p id="password-help" className="mt-2 text-sm text-slate-700">Use at least 8 characters. You may need a stronger password if requested.</p>}
        </div>
        {isSignUp && <fieldset>
          <legend className="mb-2 font-bold">Choose your role</legend>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded border border-slate-500 p-3">
            <input type="radio" name="role" value="learner" required defaultChecked className="h-5 w-5" /> Learner
          </label>
          <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3 rounded border border-slate-500 p-3">
            <input type="radio" name="role" value="storyteller" required className="h-5 w-5" /> Storyteller
          </label>
          <p className="mt-2 text-sm text-slate-700">Teacher accounts are assigned by the project team.</p>
        </fieldset>}
        <button type="submit" className="w-full bg-slate-900 font-bold text-white hover:bg-slate-700 disabled:cursor-wait">
          {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </fieldset>
      <p>{isSignUp ? "Already have an account?" : "Need an account?"}{" "}
        <Link href={isSignUp ? "/sign-in" : "/sign-up"} className="tap-link font-bold underline underline-offset-4">{isSignUp ? "Sign in" : "Sign up"}</Link>
      </p>
    </form>
  );
}
