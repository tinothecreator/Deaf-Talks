"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Notice } from "@/components/ui/notice";
import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";
  const [state, action, pending] = useActionState<AuthState, FormData>(isSignUp ? signUp : signIn, {});
  return (
    <form action={action} className="space-y-5" aria-busy={pending}>
      {state.error && <Notice id="auth-error" tone="error"><strong>Error:</strong> {state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}
      <fieldset disabled={pending} aria-describedby={state.error ? "auth-error" : undefined} className="space-y-5 disabled:opacity-70">
        <legend className="sr-only">{isSignUp ? "Create your account" : "Sign in to your account"}</legend>
        {isSignUp && <FormField id="display_name" label="Display name">
          <input id="display_name" name="display_name" autoComplete="nickname" required maxLength={80} className="auth-input" />
        </FormField>}
        <FormField id="email" label="Email">
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className="auth-input" />
        </FormField>
        <FormField id="password" label="Password" hint={isSignUp ? "Use at least 8 characters. You may need a stronger password if requested." : undefined}>
          <input id="password" name="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} required minLength={isSignUp ? 8 : 1} maxLength={128} aria-describedby={isSignUp ? "password-help" : undefined} className="auth-input" />
        </FormField>
        {isSignUp && <fieldset>
          <legend className="mb-2 font-bold">Choose your role</legend>
          <label className="role-option flex min-h-20 cursor-pointer items-center gap-4 rounded-control border border-line p-4">
            <input type="radio" name="role" value="learner" required defaultChecked className="h-5 w-5 shrink-0 accent-primary" /> <span><span className="block font-semibold">Learner</span><span className="block text-sm text-muted">Watch stories and practise SASL signs.</span></span>
          </label>
          <label className="mt-3 role-option flex min-h-20 cursor-pointer items-center gap-4 rounded-control border border-line p-4">
            <input type="radio" name="role" value="storyteller" required className="h-5 w-5 shrink-0 accent-primary" /> <span><span className="block font-semibold">Storyteller</span><span className="block text-sm text-muted">Share your stories and give learners feedback.</span></span>
          </label>
          <p className="mt-2 text-sm text-muted">Teacher accounts are assigned by the project team.</p>
        </fieldset>}
        <Button type="submit" className="w-full">
          {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </Button>
      </fieldset>
      <p>{isSignUp ? "Already have an account?" : "Need an account?"}{" "}
        <Link href={isSignUp ? "/sign-in" : "/sign-up"} className="tap-link font-bold underline underline-offset-4">{isSignUp ? "Sign in" : "Sign up"}</Link>
      </p>
    </form>
  );
}
