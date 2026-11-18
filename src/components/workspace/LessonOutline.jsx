"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { usePlayerContext, usePlayerState } from "@/components/playback/PlayerProvider";
import { GlideGroup, useGlideItem } from "@/components/ui/Glide";
import StaggerText from "@/components/ui/StaggerText";
import { GLIDE } from "@/lib/motion";
import { formatTime } from "@/lib/playback/timeline";
import { cn } from "@/lib/utils";
import { useTutorStore } from "@/store/tutor-store";

export default function LessonOutline({ lesson }) {
  const { player, lessonTrack } = usePlayerContext();
  const showingLesson = usePlayerState((s) => s.trackId === lessonTrack.id, true);
  const segmentIndex = usePlayerState((s) => s.segmentIndex, 0);
  const playing = usePlayerState((s) => s.status === "playing" || s.status === "buffering", false);
  const startsKey = usePlayerState((s) => (s.trackId === lessonTrack.id ? s.starts.join(",") : ""), "");
  const showLessonBoard = useTutorStore((s) => s.showLessonBoard);
  const starts = startsKey ? startsKey.split(",").map(Number) : [];
  const id = useId();

  const go = (i) => {
    if (showingLesson) player?.seekToSegment(i);
    else showLessonBoard(i);
  };

  return (
    <GlideGroup as="ol" className="flex flex-col">
      {lesson.segments.map((segment, i) => (
        <Chapter
          key={segment.id}
          index={i}
          title={segment.title}
          start={starts.length ? starts[i] : null}
          current={showingLesson && i === segmentIndex}
          done={showingLesson && i < segmentIndex}
          playing={playing}
          activeId={`${id}-active`}
          onSelect={() => go(i)}
        />
      ))}
    </GlideGroup>
  );
}

function Chapter({ index, title, start, current, done, playing, activeId, onSelect }) {
  const glide = useGlideItem(index, { className: "rounded-xl" });
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={current ? "step" : undefined}
        {...glide.bind}
        className={cn(
          "stagger-trigger relative isolate flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-19 outline-none transition-colors duration-300 focus-visible:ring-3 focus-visible:ring-ring/30",
          current ? "text-foreground" : done ? "text-foreground/70" : "text-foreground/60 hover:text-foreground"
        )}
      >
        {glide.on && !current ? glide.pill : null}
        {current ? (
          <motion.span
            layoutId={activeId}
            aria-hidden="true"
            className="absolute inset-0 -z-10 overflow-hidden rounded-xl bg-popover ring-1 ring-border"
            transition={GLIDE}
          >
            <ChapterProgress index={index} />
          </motion.span>
        ) : null}
        <span className="flex h-[1lh] w-5 shrink-0 items-center justify-end text-17 tabular-nums">
          {current && playing ? <Bars /> : <span className={current ? "text-brand" : "text-muted-foreground"}>{index + 1}</span>}
        </span>
        <StaggerText text={title} step={0} className={cn("min-w-0 flex-1", current && "font-medium")} />
        {start !== null ? (
          <span className="flex h-[1lh] shrink-0 items-center font-mono text-17 tabular-nums text-muted-foreground">
            {formatTime(start)}
          </span>
        ) : null}
      </button>
    </li>
  );
}

function ChapterProgress({ index }) {
  const progress = usePlayerState((s) => {
    if (s.segmentIndex !== index) return 0;
    if (s.complete) return 1;
    const d = s.durations[index] || 1;
    return Math.min(1, Math.max(0, s.segmentTime / d));
  }, 0);
  return <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand/70" style={{ transform: `scaleX(${progress})` }} />;
}

function Bars() {
  return (
    <span className="flex h-3 items-end gap-0.5 self-center" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-0.5 rounded-full bg-brand"
          animate={{ height: ["35%", "100%", "50%", "80%", "35%"] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
