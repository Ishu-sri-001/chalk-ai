"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimationFrame } from "motion/react";
import { CheckIcon } from "lucide-react";
import CharStaggerButton from "@/components/ui/CharStaggerButton";
import BoardFrame from "@/components/workspace/BoardFrame";
import { GLIDE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useTutorStore } from "@/store/tutor-store";

const TAU_SECONDS = 14;
const MAX_FILL = 0.94;
const SOFT_EDGE = 6;

const STAGES = ["Key ideas", "Diagrams", "Narration", "Checking"];

function InkFillText({ text, className }) {
  const ink = useRef(null);

  useAnimationFrame((elapsed) => {
    const el = ink.current;
    if (!el) return;
    const p = MAX_FILL * (1 - Math.exp(-elapsed / 1000 / TAU_SECONDS));
    const edge = p * (100 + SOFT_EDGE);
    const mask = `linear-gradient(90deg, #000 ${edge - SOFT_EDGE}%, transparent ${edge}%)`;
    el.style.maskImage = mask;
    el.style.webkitMaskImage = mask;
  });

  return (
    <p className={cn("relative", className)}>
      <span className="text-ink/15">{text}</span>
      <span
        ref={ink}
        aria-hidden="true"
        className="absolute inset-0 text-ink [mask-image:linear-gradient(90deg,#000_-6%,transparent_0%)]"
      >
        {text}
      </span>
    </p>
  );
}

export default function GeneratingBoard({ topic }) {
  const cancel = useTutorStore((s) => s.cancelGeneration);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const stage = Math.min(STAGES.length - 1, Math.floor(elapsed / 7));

  return (
    <BoardFrame label={`Preparing a lesson on ${topic}`}>
      <InkFillText text={topic} className="w-[70%] font-hand text-48 max-md:w-[90%]" />

      <div className="flex flex-col items-center gap-[1.6vh]">
        <ol className="flex flex-wrap items-center justify-center gap-1" aria-label="Progress">
          {STAGES.map((name, i) => {
            const done = i < stage;
            const current = i === stage;
            return (
              <li
                key={name}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "relative flex h-[4vh] items-center gap-1.5 rounded-full px-[1vw] text-19 transition-colors duration-500 max-md:h-[3vh] max-md:px-[2vw] max-sm:h-[4.4vh] max-sm:px-[3vw]",
                  current ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/55"
                )}
              >
                {current ? (
                  <motion.span layoutId="generating-stage" className="absolute inset-0 rounded-full border border-border bg-popover" transition={GLIDE} />
                ) : null}
                <span className="relative flex items-center gap-1.5">
                  {done ? <CheckIcon className="size-4 text-brand" /> : null}
                  {name}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="text-19 text-muted-foreground">
          Lessons usually take 15 to 40 seconds to write
          <span className="tabular-nums">{elapsed > 3 ? ` · ${elapsed}s` : ""}</span>
        </p>
      </div>

      <CharStaggerButton tone="muted" line onClick={cancel}>
        Cancel
      </CharStaggerButton>
    </BoardFrame>
  );
}
