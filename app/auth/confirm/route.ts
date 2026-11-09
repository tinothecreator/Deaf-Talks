import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const confirmationSchema = z.object({
  token_hash: z.string().min(1).max(1024),
  type: z.literal("email"),
});

export async function GET(request: NextRequest) {
  const parsed = confirmationSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (parsed.success) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp(parsed.data);
      if (!error) {
        const response = NextResponse.redirect(new URL("/account", request.url));
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.set("Referrer-Policy", "no-referrer");
        return response;
      }
    } catch {
      // Never log the confirmation URL or token.
    }
  }
  const response = NextResponse.redirect(new URL("/sign-in?notice=confirmation-error", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
