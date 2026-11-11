"use client";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";

export default function StoriesError({ reset }: { reset: () => void }) {
  return <div className="max-w-xl space-y-5">
    <PageHeader title="Stories unavailable" />
    <Notice tone="error">We could not load the stories. Please try again.</Notice>
    <Button onClick={reset}>Try again</Button>
  </div>;
}
