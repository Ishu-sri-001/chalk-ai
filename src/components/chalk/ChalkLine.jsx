"use client";

import ChalkSticks from "@/components/chalk/ChalkSticks";
import { chalkHeadline, chalkTone, resetLabel } from "@/lib/chalk";
import { cn } from "@/lib/utils";
import { useTutorStore } from "@/store/tutor-store";

export default function ChalkLine({ className }) {
  const daily = useTutorStore((s) => s.daily);
  if (!daily || chalkTone(daily.remaining) === "ok") return null;
  const tone = chalkTone(daily.remaining);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 text-19", className)} role="status">
      <ChalkSticks daily={daily} />
      <p className={tone === "low" ? "text-brand" : "text-destructive"}>
        {tone === "empty" ? (
          <>Out of chalk until {resetLabel(daily.resetsAt)}. Your recent lessons still replay for free.</>
        ) : (
          <>
            {chalkHeadline(daily)}
            <span className="text-muted-foreground/80"> · each new lesson uses one</span>
          </>
        )}
      </p>
    </div>
  );
}
