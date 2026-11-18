"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePlayerContext, usePlayerState } from "@/components/playback/PlayerProvider";
import VoiceNote from "@/components/playback/VoiceNote";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function Captions() {
  const { track } = usePlayerContext();
  const segmentIndex = usePlayerState((s) => s.segmentIndex, 0);
  const status = usePlayerState((s) => s.status, "idle");
  const segment = track.segments[segmentIndex];
  const words = useMemo(() => (segment ? segment.text.split(/\s+/).filter(Boolean) : []), [segment]);
  const spoken = usePlayerState((s) => {
    if (s.complete) return Infinity;
    const d = s.durations[s.segmentIndex] || 1;
    return Math.floor(Math.min(1, s.segmentTime / (d * 0.94)) * words.length + 0.0001);
  }, 0);

  if (!segment) return null;
  const started = status !== "idle";
  const count = track.segments.length;
  const key = `${track.id}:${segmentIndex}`;

  return (
    <figure className="flex flex-col gap-3 py-[3vh] max-md:py-[2.4vh]">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="flex min-w-0 items-baseline gap-2.5"
          >
            <span className="shrink-0 text-17 font-medium text-brand">
              {track.kind === "answer" ? "Answering" : `Part ${segmentIndex + 1} of ${count}`}
            </span>
            <span className="truncate text-19 text-foreground/80">
              {track.kind === "answer" ? track.question : segment.title}
            </span>
          </motion.span>
        </AnimatePresence>
        <VoiceNote />
      </figcaption>
      <AnimatePresence mode="wait" initial={false}>
        <motion.blockquote
          key={key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="min-h-[12vh] w-[80%] text-24 text-pretty max-md:min-h-[8vh] max-md:w-full max-sm:min-h-[12vh]"
        >
          {words.map((w, i) => (
            <span
              key={i}
              className={cn("transition-colors duration-300", !started || i < spoken ? "text-foreground" : "text-foreground/30")}
            >
              {w}{" "}
            </span>
          ))}
        </motion.blockquote>
      </AnimatePresence>
    </figure>
  );
}
