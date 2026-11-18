"use client";

import { useState } from "react";
import { EllipsisIcon, PlayIcon, Trash2Icon } from "lucide-react";
import FadeUp from "@/components/animations/FadeUp";
import LineDraw from "@/components/animations/LineDraw";
import ParaAnim from "@/components/animations/ParaAnim";
import SectionHeading from "@/components/home/SectionHeading";
import CharStaggerButton from "@/components/ui/CharStaggerButton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import StaggerText from "@/components/ui/StaggerText";
import { timeAgo } from "@/lib/time";
import { useTutorStore } from "@/store/tutor-store";

const SHOWN = 3;

const lessonMeta = (entry) => {
  const seconds = entry.lesson.estimatedDuration;
  const length = seconds ? `${Math.max(1, Math.round(seconds / 60))} min` : timeAgo(entry.createdAt);
  return `${entry.lesson.segments.length} parts • ${length}`;
};

export default function RecentLessons({ className }) {
  const history = useTutorStore((s) => s.history);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? history : history.slice(0, SHOWN);

  return (
    <aside aria-labelledby="recent-heading" className={className}>
      <SectionHeading
        id="recent-heading"
        action={
          history.length > SHOWN ? (
            <CharStaggerButton
              tone="brand"
              size="md"
              underline
              arrow
              step={0}
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Show less" : "View all"}
            </CharStaggerButton>
          ) : null
        }
      >
        Recent lessons
      </SectionHeading>

      {history.length === 0 ? (
        <ParaAnim delay={0.4} className="w-[90%] text-21 text-muted-foreground">
          Lessons you start will appear here. Replaying one is free and doesn&apos;t use any chalk.
        </ParaAnim>
      ) : (
        <ul className="scrollbar-quiet flex min-h-0 flex-1 flex-col overflow-y-auto">
          {shown.map((entry, i) => (
            <RecentRow key={entry.id} entry={entry} delay={i < SHOWN ? 0.45 + i * 0.08 : 0} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function RecentRow({ entry, delay }) {
  const openFromHistory = useTutorStore((s) => s.openFromHistory);
  const removeFromHistory = useTutorStore((s) => s.removeFromHistory);
  const title = entry.title || entry.topic;

  return (
    <li className="flex flex-col">
      <FadeUp delay={delay} className="flex items-center gap-2 py-[1.4vh] max-md:py-[1vh] max-sm:py-[1.4vh]">
        <button
          type="button"
          onClick={() => openFromHistory(entry.id)}
          className="stagger-trigger group/row flex min-w-0 flex-1 items-center gap-4 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <span className="grid aspect-square h-[6.4vh] shrink-0 place-items-center rounded-lg bg-brand/8 text-brand transition-colors duration-300 group-hover/row:bg-brand group-hover/row:text-brand-foreground max-md:h-[4.8vh] max-sm:h-[6.8vh]">
            <PlayIcon aria-hidden="true" strokeWidth={1.8} className="size-5 translate-x-px" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <StaggerText text={title} step={0} className="truncate text-21 font-medium text-foreground" />
            <span className="text-17 text-muted-foreground">{lessonMeta(entry)}</span>
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More options for ${title}`}
              className="grid aspect-square h-[4.4vh] shrink-0 place-items-center rounded-full text-foreground/70 outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 max-md:h-[3.4vh] max-sm:h-[4.8vh]"
            >
              <EllipsisIcon aria-hidden="true" className="size-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[12vw] max-md:w-[30vw] max-sm:w-[50vw]">
            <DropdownMenuItem onSelect={() => openFromHistory(entry.id)}>
              <PlayIcon aria-hidden="true" />
              Replay lesson
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => removeFromHistory(entry.id)} className="text-destructive">
              <Trash2Icon aria-hidden="true" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </FadeUp>
      <LineDraw start="top 95%" delay={delay} className="h-px w-full bg-border" />
    </li>
  );
}
