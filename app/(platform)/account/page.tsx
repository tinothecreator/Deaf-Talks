import { requireAccount } from "@/lib/auth/session";
import { roleLabels } from "@/lib/auth/validation";
import { signOut } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/notice";
import { LogOut } from "lucide-react";
import Link from "next/link";

export default async function Account() {
  const { profile } = await requireAccount();
  return <div className="max-w-xl space-y-6">
    <PageHeader title="Your account" />
    <Card className="space-y-6">
      <Avatar name={profile.display_name} large />
      <dl className="space-y-4">
        <div><dt className="text-sm text-muted">Display name</dt><dd className="text-xl font-semibold">{profile.display_name}</dd></div>
        <div><dt className="text-sm text-muted">Role</dt><dd className="font-semibold">{roleLabels[profile.role]}</dd></div>
      </dl>
    </Card>
    {profile.role === "storyteller" ? <div className="flex flex-wrap gap-3">
      <Link href="/studio" className={buttonStyles()}>My stories</Link>
      <Link href="/studio/new" className={buttonStyles("secondary")}>Upload a story</Link>
      <Link href="/stories" className={buttonStyles("quiet")}>Stories</Link>
    </div> : profile.role === "learner" ? <Link href="/stories" className={buttonStyles()}>Browse stories</Link>
      : <Notice>Reviews coming soon</Notice>}
    <form action={signOut} className="border-t border-line/40 pt-6"><Button variant="secondary" type="submit"><LogOut size={18} aria-hidden="true" />Sign out</Button></form>
  </div>;
}
