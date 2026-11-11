import Link from "next/link";
import type { FeedStory } from "@/lib/home/data";
import { Avatar } from "@/components/ui/avatar";
import { StatusChip } from "@/components/ui/status-chip";
import { VideoPreview } from "./video-preview";

export function StoryCard({ story, own = false }: { story: FeedStory; own?: boolean }) {
  return <Link href={own ? `/studio/${story.id}${story.duration_seconds ? "" : "/edit"}` : `/stories/${story.id}`} prefetch={false} aria-label={story.title} className="block h-full rounded-card border border-line/40 bg-surface p-3 hover:border-primary">
    <VideoPreview signedUrl={story.signedUrl} name={story.storyteller.display_name} duration={story.duration_seconds} />
    <div className="space-y-3 px-1 pt-4 pb-2">
      <h3 className="truncate text-xl font-bold tracking-tight">{story.title}</h3>
      <div className="flex min-w-0 items-center gap-3"><Avatar name={story.storyteller.display_name} /><div className="min-w-0 text-sm"><p className="font-semibold">{story.storyteller.display_name}</p><p className="text-muted">{story.ownership_settings?.credit_line ?? story.storyteller.display_name}</p></div></div>
      <p className="line-clamp-2 text-sm text-muted">{story.caption_en}</p>
      {own && <StatusChip tone={story.status === "published" ? "success" : "info"}>{!story.duration_seconds ? "Incomplete" : story.status === "published" ? "Published" : "Draft"}</StatusChip>}
    </div>
  </Link>;
}
