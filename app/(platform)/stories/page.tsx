import Link from "next/link";
import { requireAccount } from "@/lib/auth/session";
import { listWatchableStories } from "@/lib/stories/playback";
import { formatTime } from "@/lib/media/time";

export default async function Stories() {
  await requireAccount();
  const stories = await listWatchableStories();
  return <div className="space-y-6">
    <h1 className="text-3xl font-bold">Stories</h1>
    <p>Watch SASL stories and explore the key signs. English captions are shown with each video.</p>
    {!stories.length ? <p>No stories to watch yet.</p> : <ul className="grid gap-5 sm:grid-cols-2">
      {stories.map(story => <li key={story.id}>
        <Link href={`/stories/${story.id}`} prefetch={false} className="block h-full space-y-3 rounded-lg border border-slate-500 bg-white p-5 hover:bg-slate-100">
          <h2 className="text-xl font-bold underline underline-offset-4">{story.title}</h2>
          <p>Storyteller: {story.storyteller.display_name}</p>
          <p>Credit: {story.ownership_settings.credit_line}</p>
          <p>Duration: {formatTime(story.duration_seconds)}</p>
          <p>{story.caption_en.length > 180 ? `${story.caption_en.slice(0, 180).trimEnd()}…` : story.caption_en}</p>
          <span className="inline-block font-bold underline">Watch story</span>
        </Link>
      </li>)}
    </ul>}
  </div>;
}
