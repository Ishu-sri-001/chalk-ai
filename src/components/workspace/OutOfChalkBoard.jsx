"use client";

import { HistoryIcon } from "lucide-react";
import ChalkSticks from "@/components/chalk/ChalkSticks";
import ArrowFillButton from "@/components/ui/ArrowFillButton";
import BoardFrame from "@/components/workspace/BoardFrame";
import { arrivesPhrase } from "@/lib/chalk";

export default function OutOfChalkBoard({ daily, onHome }) {
  const when = daily ? arrivesPhrase(daily.resetsAt) : null;
  return (
    <BoardFrame label="Out of chalk for today">
      <div className="flex flex-col items-center gap-[1.6vh]">
        <p className="font-heading text-48 font-medium text-foreground">Out of chalk for today.</p>
        {daily ? <ChalkSticks daily={daily} className="justify-center" /> : null}
        <p className="w-[70%] text-21 text-muted-foreground max-md:w-[90%]">
          Chalk runs on Google&apos;s free plan, and today&apos;s lessons are all used up.
          {when ? <> New chalk arrives {when}.</> : null} Your recent lessons still replay for free.
        </p>
      </div>
      <ArrowFillButton variant="outline" icon={HistoryIcon} onClick={onHome}>
        See recent lessons
      </ArrowFillButton>
    </BoardFrame>
  );
}
