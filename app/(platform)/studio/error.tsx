"use client";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";

export default function StudioError({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-3xl space-y-5"><PageHeader title="Stories unavailable" />
    <Notice tone="error">Could not load your stories.</Notice>
    <Button onClick={reset}>Try again</Button>
  </div>;
}
