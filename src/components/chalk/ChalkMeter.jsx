"use client";

import ChalkSticks from "@/components/chalk/ChalkSticks";
import CharStaggerButton from "@/components/ui/CharStaggerButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { arrivesPhrase, chalkHeadline, chalkTone } from "@/lib/chalk";
import { useTutorStore } from "@/store/tutor-store";

function ChalkIcon({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <rect x="3" y="6.4" width="10" height="3.2" rx="1.6" transform="rotate(-28 8 8)" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="3.4" cy="13.2" r="0.7" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function Explainer({ daily }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="font-heading text-30 font-medium text-foreground">{chalkHeadline(daily)}</p>
        <div className="flex items-center gap-3">
          <ChalkSticks daily={daily} />
          <span className="text-17 tabular-nums text-muted-foreground">
            {daily.remaining} of {daily.limit}
          </span>
        </div>
      </div>
      <p className="text-foreground/80">
        Chalk runs on Google&apos;s free Gemini plan, which allows only so many lessons a day.{" "}
        <span className="text-foreground">Each new lesson uses one stick.</span> Replaying a lesson is free;
        questions use a little of the same allowance.
      </p>
      {daily.providerExhausted ? (
        <p className="text-brand">Google&apos;s free allowance ran out early today, so Chalk is resting until the reset.</p>
      ) : null}
      <div className="h-px w-full bg-hairline" />
      <p className="text-17 text-muted-foreground">
        New chalk arrives {arrivesPhrase(daily.resetsAt)} (midnight Pacific time). The count is Chalk&apos;s own
        estimate; Google sets the exact limit.
      </p>
    </div>
  );
}

export default function ChalkMeter() {
  const daily = useTutorStore((s) => s.daily);
  if (!daily) return null;
  const tone = chalkTone(daily.remaining);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <CharStaggerButton
          tone={tone === "ok" ? "muted" : tone === "low" ? "brand" : "danger"}
          icon={ChalkIcon}
          line
          aria-label={`${chalkHeadline(daily)}. ${daily.remaining} of ${daily.limit} lessons left. Details`}
          className="tabular-nums"
        >
          {`${daily.remaining} left`}
        </CharStaggerButton>
      </PopoverTrigger>
      <PopoverContent align="end">
        <Explainer daily={daily} />
      </PopoverContent>
    </Popover>
  );
}
