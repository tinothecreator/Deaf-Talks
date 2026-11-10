import Link from "next/link";
import { requireAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { IncompleteUpload } from "@/components/stories/incomplete-upload";

export default async function MyStories() {
  const { user, profile } = await requireAccount();
  if (profile.role !== "storyteller") return <div><h1 className="text-3xl font-bold">My stories</h1><p>Only storytellers can upload and manage stories.</p><Link className="tap-link underline" href="/account">Your account</Link></div>;
  const supabase = await createClient();
  const { data: stories, error } = await supabase.from("stories")
    .select("id, title, status, created_at, duration_seconds, ownership_settings(credit_line)")
    .eq("storyteller_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your stories.");
  return <div className="max-w-2xl space-y-6">
    <h1 className="text-3xl font-bold">My stories</h1>
    <p>Your new stories are private drafts. Only you can view them.</p>
    <Link className="tap-link border border-slate-700 font-bold underline" href="/studio/new">Upload a story</Link>
    {!stories?.length ? <p>You have no stories yet. Upload a short video to begin.</p> : <ul className="space-y-5">{stories.map(story => {
      const ownership = Array.isArray(story.ownership_settings) ? story.ownership_settings[0] : story.ownership_settings;
      return <li key={story.id} className="space-y-3 rounded-lg border border-slate-400 bg-white p-5">
        <h2 className="text-xl font-bold">{story.duration_seconds ? <Link className="tap-link underline" href={`/studio/${story.id}`}>{story.title}</Link> : story.title}</h2>
        <p>Storyteller: {profile.display_name}</p><p>Credit: {ownership?.credit_line ?? profile.display_name}</p>
        <p>{story.status === "draft" ? "Draft" : "Published"} · <time dateTime={story.created_at}>{new Date(story.created_at).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}</time> · {story.duration_seconds ? `${story.duration_seconds} seconds` : "Duration pending"}</p>
        {!!story.duration_seconds && <Link className="tap-link underline" href={`/studio/${story.id}/edit`}>Edit story</Link>}
        {!story.duration_seconds && <IncompleteUpload storyId={story.id} />}
      </li>;
    })}</ul>}
  </div>;
}
