"use client";

import { AnimatePresence } from "motion/react";
import { HistoryIcon, XIcon } from "lucide-react";
import CharStaggerButton from "@/components/ui/CharStaggerButton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useTutorStore } from "@/store/tutor-store";

export default function HistoryMenu() {
  const history = useTutorStore((s) => s.history);
  const openFromHistory = useTutorStore((s) => s.openFromHistory);
  const removeFromHistory = useTutorStore((s) => s.removeFromHistory);
  const activeId = useTutorStore((s) => s.lessonId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CharStaggerButton tone="muted" icon={HistoryIcon} line aria-label="Recent lessons" textClassName="max-sm:hidden">
          Recent
        </CharStaggerButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[24vw] max-md:w-[50vw] max-sm:w-[86vw]">
        <DropdownMenuLabel className="flex items-baseline justify-between gap-3">
          <span className="text-19 font-medium text-foreground">Recent lessons</span>
          <span>Saved in this browser</span>
        </DropdownMenuLabel>
        {history.length === 0 ? (
          <DropdownMenuLabel className="text-19">
            Lessons you start will appear here so you can replay them later, for free.
          </DropdownMenuLabel>
        ) : (
          <AnimatePresence initial={false}>
            {history.map((entry) => {
              const current = entry.id === activeId;
              const title = entry.title || entry.topic;
              return (
                <DropdownMenuItem
                  key={entry.id}
                  layout="position"
                  exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }}
                  onSelect={() => openFromHistory(entry.id)}
                  className="group/item gap-3"
                  aria-current={current ? "true" : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={cn("size-1.5 shrink-0 rounded-full transition-colors", current ? "bg-brand" : "bg-foreground/15")}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-19 text-foreground">{title}</span>
                    <span className="text-17 text-muted-foreground">
                      {entry.lesson.segments.length} parts · {timeAgo(entry.createdAt)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-[opacity,background-color,color] group-hover/item:opacity-100 group-focus/item:opacity-100 hover:bg-foreground/6 hover:text-foreground focus-visible:opacity-100"
                    aria-label={`Remove ${title} from recent lessons`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeFromHistory(entry.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <XIcon className="size-4" />
                  </button>
                </DropdownMenuItem>
              );
            })}
          </AnimatePresence>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
