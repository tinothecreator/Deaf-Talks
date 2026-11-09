import { AuthForm } from "@/components/auth-form";

const notices: Record<string, string> = {
  "signed-out": "You are signed out.",
  "sign-out-error": "We could not sign you out. Please try the sign-out button again.",
  "confirmation-error": "The confirmation link is invalid or has expired. Try signing in if you have already confirmed your email, or contact the project team.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const message = notice && Object.hasOwn(notices, notice) ? notices[notice] : null;
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-3xl font-bold">Sign in</h1>
      {message && <p role={notice?.endsWith("error") ? "alert" : "status"} className="rounded border-2 border-slate-600 bg-white p-4">{message}</p>}
      <AuthForm mode="sign-in" />
    </div>
  );
}
