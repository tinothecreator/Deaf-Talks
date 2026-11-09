import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "./validation";

// React cache deduplicates this check only within the current server request.
export const getCurrentAccount = cache(async () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { user: null, profile: null, error: "Sign-in is not configured yet. Please try again later." };
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && (!error.status || error.status >= 500)) {
      return { user: null, profile: null, error: "We could not check your account. Please try again." };
    }
    if (!user) return { user: null, profile: null, error: null };

    const { data, error: profileError } = await supabase
      .from("profiles").select("id, display_name, role").eq("id", user.id).single();
    const profile = profileSchema.safeParse(data);
    if (profileError || !profile.success) {
      return { user, profile: null, error: "We could not load your profile. Please try again or contact the project team." };
    }
    return { user, profile: profile.data, error: null };
  } catch {
    return { user: null, profile: null, error: "We could not reach the sign-in service. Please try again." };
  }
});

export async function requireAccount() {
  const account = await getCurrentAccount();
  if (!account.user && !account.error) redirect("/sign-in");
  // Never substitute a role from user-editable auth metadata.
  if (!account.user || !account.profile) {
    throw new Error(account.error ?? "Your profile is unavailable.");
  }
  return { user: account.user, profile: account.profile };
}
