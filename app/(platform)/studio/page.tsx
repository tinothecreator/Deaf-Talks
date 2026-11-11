import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { buttonStyles } from "@/components/ui/button";
import Link from "next/link";
import { requireAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { IncompleteUpload } from "@/components/stories/incomplete-upload";

export default async function MyStories() {
  const { user, profile } = await requireAccount();
  if (profile.role !== "storyteller") return <div><PageHeader title="My stories" /><p>Only storytellers can upload and manage stories.</p><Link className={buttonStyles("quiet")} href="/account">Your account</Link></div>;
  const supabase = await createClient();
  const { data: stories, error } = await supabase.from("stories")
    .select("id, title, status, created_at, duration_seconds, ownership_settings(credit_line)")
    .eq("storyteller_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your stories.");
  return <div className="mx-auto max-w-3xl space-y-6">
    <PageHeader title="My stories" />
    <p>Your new stories are private drafts. Only you can view them.</p>
    <Link className={buttonStyles()} href="/studio/new">Upload a story</Link>
    {!stories?.length ? <EmptyState title="You have no stories yet">Upload a short video to begin.</EmptyState> : <ul className="space-y-5">{stories.map(story => {
      const ownership = Array.isArray(story.ownership_settings) ? story.ownership_settings[0] : story.ownership_settings;
      return <li key={story.id}><Card className="space-y-3">
        <h2 className="text-xl font-semibold">{story.duration_seconds ? <Link className="tap-link -ml-3 justify-start text-left text-primary underline underline-offset-4" href={`/studio/${story.id}`}>{story.title}</Link> : story.title}</h2>
        <p>Storyteller: {profile.display_name}</p><p>Credit: {ownership?.credit_line ?? profile.display_name}</p>
        <p><StatusChip tone={story.duration_seconds && story.status === "published" ? "success" : "info"}>{!story.duration_seconds ? "Incomplete" : story.status === "draft" ? "Draft" : "Published"}</StatusChip> · <time dateTime={story.created_at}>{new Date(story.created_at).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}</time> · {story.duration_seconds ? `${story.duration_seconds} seconds` : "Duration pending"}</p>
        {!!story.duration_seconds && <Link className={buttonStyles("secondary")} href={`/studio/${story.id}/edit`}>Edit</Link>}
        {!story.duration_seconds && <IncompleteUpload storyId={story.id} />}
      </Card></li>;
    })}</ul>}
  </div>;
}
