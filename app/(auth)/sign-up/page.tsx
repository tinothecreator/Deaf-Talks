import { AuthForm } from "@/components/auth-form";

export default function SignUp() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p>Choose how you want to take part in SignStories.</p>
      <AuthForm mode="sign-up" />
    </div>
  );
}
