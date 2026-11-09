"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema, signUpSchema } from "@/lib/auth/validation";

export type AuthState = { error?: string; message?: string };

function authError(code: string | undefined, signingUp: boolean): string {
  switch (code) {
    case "invalid_credentials": return "The email or password is incorrect. Please try again.";
    case "email_not_confirmed": return "Confirm your email using the link in your inbox, then sign in.";
    case "user_already_exists": return "An account already exists for this email. Please sign in.";
    case "weak_password": return "Choose a stronger password with letters, numbers, and symbols.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "Too many attempts. Please wait a few minutes and try again.";
    case "signup_disabled": return "New accounts are not available right now. Please try again later.";
    default: return signingUp
      ? "We could not create your account. Please try again. If this continues, contact the project team."
      : "We could not sign you in. Please try again.";
  }
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: authError(error.code, false) };
  } catch {
    return { error: "We could not reach the sign-in service. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let hasSession = false;
  try {
    const supabase = await createClient();
    const { email, password, display_name, role } = parsed.data;
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { display_name, role } },
    });
    if (error) return { error: authError(error.code, true) };
    hasSession = Boolean(data.session);
  } catch {
    return { error: "We could not reach the sign-up service. Please try again." };
  }
  if (!hasSession) {
    return { message: "Check your email for a confirmation link before signing in. If you already have an account, sign in with your existing password." };
  }
  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signOut(): Promise<void> {
  let failed = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  if (failed) redirect("/sign-in?notice=sign-out-error");
  revalidatePath("/", "layout");
  redirect("/sign-in?notice=signed-out");
}
