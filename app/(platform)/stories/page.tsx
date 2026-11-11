import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireAccount } from "@/lib/auth/session";
import { listWatchableStories } from "@/lib/stories/playback";
import { formatTime } from "@/lib/media/time";
import { Avatar } from "@/components/ui/avatar";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";

export default async function Stories() {
  await requireAccount();
  const stories = await listWatchableStories();
  return <div className="space-y-8">
    <PageHeader title="Stories" eyebrow="Watch. Learn. Connect." description="Watch SASL stories and explore the key signs. English captions are shown with each video." />
    {!stories.length ? <EmptyState title="No stories to watch yet." /> : <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {stories.map(story => <li key={story.id} className="min-w-0">
        <Card className="flex h-full flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><Avatar name={story.storyteller.display_name} large /><StatusChip tone="time">Duration: {formatTime(story.duration_seconds)}</StatusChip></div>
          <h2 className="text-xl font-semibold">{story.title}</h2>
          <div className="space-y-1 text-sm"><p className="font-semibold">Storyteller: {story.storyteller.display_name}</p><p className="text-muted">Credit: {story.ownership_settings.credit_line}</p></div>
          <p className="flex-1 text-muted">{story.caption_en.length > 180 ? `${story.caption_en.slice(0, 180).trimEnd()}…` : story.caption_en}</p>
          <Link href={`/stories/${story.id}`} prefetch={false} className={buttonStyles("secondary", "w-full")} aria-label={`Watch story: ${story.title}`}>Watch story <ArrowRight size={18} aria-hidden="true" /></Link>
        </Card>
      </li>)}
    </ul>}
  </div>;
}
