import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AuthForm } from "@/components/auth-form";

export default function SignUp() {
  return (
    <Card className="mx-auto max-w-md space-y-6">
      <PageHeader title="Create your account" />
      <p>Choose how you want to take part in SignStories.</p>
      <AuthForm mode="sign-up" />
    </Card>
  );
}
