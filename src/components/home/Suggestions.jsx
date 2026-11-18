"use client";

import { useState } from "react";
import FadeUp from "@/components/animations/FadeUp";
import SectionHeading from "@/components/home/SectionHeading";
import CharStaggerButton from "@/components/ui/CharStaggerButton";
import StaggerText from "@/components/ui/StaggerText";
import { SUGGESTIONS, SUGGESTIONS_PER_PAGE } from "@/data/suggestions";
import { cn } from "@/lib/utils";

const PAGES = Math.ceil(SUGGESTIONS.length / SUGGESTIONS_PER_PAGE);

export default function Suggestions({ disabled, onPick, className }) {
  const [page, setPage] = useState(0);
  const [paged, setPaged] = useState(false);
  const start = page * SUGGESTIONS_PER_PAGE;
  const shown = SUGGESTIONS.slice(start, start + SUGGESTIONS_PER_PAGE);

  const nextPage = () => {
    setPaged(true);
    setPage((p) => (p + 1) % PAGES);
  };

  return (
    <div className={cn("flex flex-col gap-[2.4vh] max-md:gap-[1.6vh]", className)}>
      <SectionHeading
        action={
          <CharStaggerButton tone="brand" size="md" underline arrow step={0} onClick={nextPage}>
            See more
          </CharStaggerButton>
        }
      >
        Try a suggested topic
      </SectionHeading>
      <ul className="grid grid-cols-3 gap-4 max-md:grid-cols-2 max-md:gap-3 max-sm:grid-cols-1">
        {shown.map((item, i) => (
          <FadeUp as="li" key={item.topic} delay={paged ? i * 0.06 : 0.6 + i * 0.06}>
            <SuggestionCard item={item} disabled={disabled} onPick={onPick} />
          </FadeUp>
        ))}
      </ul>
    </div>
  );
}

function SuggestionCard({ item, disabled, onPick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(item.topic)}
      className={cn(
        "stagger-trigger flex h-[10vh] w-full items-center gap-4 rounded-xl border border-border bg-card px-[1.4vw] text-left shadow-(--shadow-card) outline-none",
        "transition-[border-color] duration-300 ease-out-quint hover:border-brand/40 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-45",
        "max-md:h-[7vh] max-md:gap-3 max-md:px-[3vw] max-sm:h-[9vh] max-sm:px-[5vw]"
      )}
    >
      <Icon aria-hidden="true" strokeWidth={1.5} className="size-6 shrink-0 text-foreground/80" />
      <StaggerText text={item.topic} step={0} className="text-21 font-medium text-foreground" />
    </button>
  );
}
