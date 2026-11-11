import Link from "next/link";
import { listFeedStories } from "@/lib/home/data";
import { StoryCard } from "@/components/stories/story-card";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function Stories() {
  const stories = await listFeedStories();
  return <div className="space-y-8">
    <PageHeader title="Stories" />
    {!stories.length ? <EmptyState title="More stories soon"><Link href="/home" className={buttonStyles("secondary")}>Back to Home</Link></EmptyState> : <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {stories.map(story => <li key={story.id} className="min-w-0"><StoryCard story={story} /></li>)}
    </ul>}
  </div>;
}
