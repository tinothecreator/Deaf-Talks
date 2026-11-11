import Link from "next/link";
import { ArrowRight, BookOpen, MessageSquareText, Video } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return <div className="space-y-12 sm:space-y-16">
    <section className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6 py-3 sm:py-8">
        <p className="text-sm font-semibold tracking-wide text-primary">A place for SASL stories</p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">Stories to watch.<br />Signs to learn.</h1>
        <p className="max-w-xl text-lg text-muted">Learn South African Sign Language through stories from Deaf storytellers.</p>
        <p className="max-w-xl text-muted">A home for Deaf storytellers and people learning South African Sign Language (SASL). Stories, learning, and human feedback, with clear credit and ownership.</p>
        <div className="flex flex-wrap gap-3"><Link href="/sign-up" className={buttonStyles()}>Sign up <ArrowRight size={18} aria-hidden="true" /></Link><Link href="/sign-in" className={buttonStyles("secondary")}>Sign in</Link></div>
      </div>
      <Card className="bg-soft! p-7! sm:p-9!">
        <BookOpen size={40} aria-hidden="true" className="mb-8 text-primary" />
        <p className="text-2xl font-semibold leading-snug">Deaf stories.<br />Shared with care.</p>
        <p className="mt-4 text-muted">Watch with captions. Learn at your pace. Get feedback from people.</p>
      </Card>
    </section>
    <section aria-labelledby="how-it-works" className="space-y-6">
      <h2 id="how-it-works" className="text-2xl font-semibold">How it works</h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {[{ title: "Watch", text: "Explore SASL stories with English captions and clear storyteller credit.", icon: BookOpen }, { title: "Practise", text: "Choose a key sign and record your own attempt.", icon: Video }, { title: "Get feedback", text: "Learn with feedback from a storyteller or teacher.", icon: MessageSquareText }].map(({ title, text, icon: Icon }, index) => <li key={title}><Card className="h-full space-y-4"><div className="flex items-center justify-between text-primary"><Icon size={26} aria-hidden="true" /><span className="text-sm font-semibold">Step {index + 1}</span></div><h3 className="text-xl font-semibold">{title}</h3><p className="text-muted">{text}</p></Card></li>)}
      </ol>
    </section>
  </div>;
}
