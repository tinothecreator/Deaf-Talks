import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";

export default function LoadingStories() {
  return <div className="space-y-6"><Notice>Loading stories…</Notice><div aria-hidden="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(item => <Card key={item} className="space-y-5"><div className="h-20 w-20 rounded-card bg-soft" /><div className="h-6 w-2/3 rounded bg-soft" /><div className="h-20 rounded bg-soft" /></Card>)}</div></div>;
}
