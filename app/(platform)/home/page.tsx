import Link from "next/link";
import type { ReactNode } from "react";
import { Plus, ArrowRight } from "lucide-react";
import { requireAccount } from "@/lib/auth/session";
import { listFeedStories, listHomePractice, homeReviews, type FeedStory } from "@/lib/home/data";
import { formatTime } from "@/lib/media/time";
import { StoryCard } from "@/components/stories/story-card";
import { VideoPreview } from "@/components/stories/video-preview";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";

function Section({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return <section className="min-w-0 space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold tracking-tight">{title}</h2><Link href={href} className={buttonStyles("quiet", "shrink-0 px-3")} aria-label={`See all: ${title}`}>See all <ArrowRight size={18} aria-hidden="true" /></Link></div>{children}</section>;
}
function StoryRail({ stories, own = false }: { stories: FeedStory[]; own?: boolean }) {
  return stories.length ? <ul className="video-rail">{stories.map(story => <li key={story.id}><StoryCard story={story} own={own} /></li>)}</ul> : <EmptyState title={own ? "Your first story starts here" : "More stories soon"}><Link href={own ? "/studio/new" : "/stories"} className={buttonStyles("secondary")}>{own ? "Upload a story" : "Explore stories"}</Link></EmptyState>;
}

export default async function Home() {
  const { profile } = await requireAccount();
  const [stories, ownStories, attempts, reviews] = await Promise.all([
    listFeedStories(8), profile.role === "storyteller" ? listFeedStories(8, true) : Promise.resolve([]),
    profile.role === "learner" ? listHomePractice() : Promise.resolve([]),
    profile.role !== "learner" ? homeReviews() : Promise.resolve({ count: 0, attempts: [] }),
  ]);
  const signs = stories.flatMap(story => [...story.signs].sort((a, b) => a.start_seconds - b.start_seconds).map(sign => ({ story, sign }))).slice(0, 12);
  return <div className="min-w-0 space-y-10">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Home</h1>{profile.role === "storyteller" && <Link href="/studio/new" className={buttonStyles()}><Plus size={20} aria-hidden="true" />Upload a story</Link>}</div>
    <Section title="Latest stories" href="/stories"><StoryRail stories={stories} /></Section>
    {profile.role === "learner" && <>
      <Section title="Practise a sign" href="/stories">{signs.length ? <ul className="video-rail">{signs.map(({ story, sign }) => <li key={sign.id}><Link href={`/stories/${story.id}/practice?sign=${sign.id}`} className="block rounded-card border border-line/40 bg-highlight p-5 hover:border-primary"><span className="font-semibold text-highlight-ink">{formatTime(sign.start_seconds)}</span><h3 className="mt-3 text-2xl font-bold tracking-tight">{sign.label}</h3><p className="mt-2 truncate font-semibold">{story.title}</p><p className="mt-3 text-sm text-muted">{story.storyteller.display_name} · {story.ownership_settings?.credit_line ?? story.storyteller.display_name}</p></Link></li>)}</ul> : <EmptyState title="Find your next sign"><Link href="/stories" className={buttonStyles("secondary")}>Explore stories</Link></EmptyState>}</Section>
      <Section title="Your recent practice" href="/practice">{attempts.length ? <ul className="video-rail">{attempts.map(attempt => <li key={attempt.id}><Link href={`/practice/${attempt.id}`} className="block h-full rounded-card border border-line/40 bg-surface p-3 hover:border-primary"><VideoPreview signedUrl={attempt.signedUrl} name={profile.display_name} duration={attempt.duration_seconds} /><div className="space-y-2 px-1 pt-4 pb-2"><h3 className="truncate text-xl font-bold tracking-tight">{attempt.sign?.label ?? "Your practice"}</h3><p className="line-clamp-2 text-sm text-muted">{attempt.caption}</p></div></Link></li>)}</ul> : <EmptyState title="Make your first attempt"><Link href="/stories" className={buttonStyles("secondary")}>Choose a story</Link></EmptyState>}</Section>
    </>}
    {profile.role === "storyteller" && <Section title="Your stories" href="/studio"><StoryRail stories={ownStories} own /></Section>}
    {profile.role !== "learner" && <Section title={`Waiting for review · ${reviews.count}`} href="/reviews">{reviews.attempts.length ? <ul className="space-y-3">{reviews.attempts.map(attempt => <li key={attempt.id}><Link href={`/reviews/${attempt.id}`} className="flex min-h-12 items-center gap-4 rounded-card border border-line/40 bg-surface p-4 hover:border-primary"><Avatar name={attempt.learner?.display_name ?? "Learner"} /><div className="min-w-0"><h3 className="font-bold tracking-tight">{attempt.learner?.display_name ?? "Learner"}</h3><p className="line-clamp-2 text-sm text-muted">{attempt.caption}</p></div><ArrowRight size={20} className="ml-auto shrink-0 text-primary" aria-hidden="true" /></Link></li>)}</ul> : <EmptyState title="You’re all caught up"><Link href="/stories" className={buttonStyles("secondary")}>Watch a story</Link></EmptyState>}</Section>}
  </div>;
}
