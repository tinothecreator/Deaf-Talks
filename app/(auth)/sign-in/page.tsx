import { Notice } from "@/components/ui/notice";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
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
    <Card className="mx-auto max-w-md space-y-6">
      <PageHeader title="Sign in" />
      {message && <Notice tone={notice?.endsWith("error") ? "error" : "info"}>{message}</Notice>}
      <AuthForm mode="sign-in" />
    </Card>
  );
}
