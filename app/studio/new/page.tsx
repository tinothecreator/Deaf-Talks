import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { buttonStyles } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentAccount } from "@/lib/auth/session";
import { UploadForm } from "@/components/stories/upload-form";

// Outside the protected layout so signed-out visitors receive an explanation.
export default async function NewStory() {
  const { user, profile, error } = await getCurrentAccount();
  if (error) return <p role="alert">{error}</p>;
  if (!user || profile?.role !== "storyteller") return <div className="max-w-xl space-y-5">
    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Storyteller account needed</h1>
    <p>{user ? "Only storytellers can upload stories. Your account cannot upload videos." : "Sign in with a Storyteller account to upload a video."}</p>
    <Link className={buttonStyles("quiet")} href={user ? "/account" : "/sign-in"}>{user ? "Your account" : "Sign in"}</Link>
  </div>;
  return <div className="mx-auto max-w-3xl space-y-6">
    <PageHeader title="Upload a story" />
    <Notice>Your story stays a private draft. Only you can view it. Credit: {profile.display_name}.</Notice>
    <Notice>To use less data, record at 720p and keep your video under 60 seconds. Film in good light so your hands and face are clear. If the file is too large, trim it or export at a lower resolution before uploading.</Notice>
    <Card><UploadForm /></Card>
  </div>;
}
