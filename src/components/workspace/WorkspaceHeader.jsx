"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeftIcon } from "lucide-react";
import { usePlayerState } from "@/components/playback/PlayerProvider";
import CharStaggerButton from "@/components/ui/CharStaggerButton";
import { EASE_OUT } from "@/lib/motion";
import { formatTime } from "@/lib/playback/timeline";
import { useTutorStore } from "@/store/tutor-store";

export default function WorkspaceHeader() {
  const status = useTutorStore((s) => s.status);
  const topic = useTutorStore((s) => s.topic);
  const lesson = useTutorStore((s) => s.lesson);
  const goHome = useTutorStore((s) => s.goHome);
  const ready = status === "ready" && lesson;
  const title = ready ? lesson.title : topic;

  return (
    <div className="flex items-end justify-between gap-6 max-sm:flex-col max-sm:items-start max-sm:gap-1">
      <div className="flex min-w-0 flex-col gap-2">
        <CharStaggerButton tone="muted" size="xs" icon={ArrowLeftIcon} line onClick={goHome}>
          All topics
        </CharStaggerButton>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }}
            className="truncate text-48 text-foreground"
          >
            {title}
          </motion.h1>
        </AnimatePresence>
      </div>
      {ready ? <LessonMeta lesson={lesson} /> : null}
    </div>
  );
}

function LessonMeta({ lesson }) {
  const total = usePlayerState((s) => (s.trackId?.startsWith("lesson:") ? Math.round(s.total) : null), null);
  return (
    <p className="shrink-0 text-19 tabular-nums text-muted-foreground">
      {lesson.segments.length} parts
      <span className="px-2 text-foreground/25">·</span>
      {total ? formatTime(total) : `about ${Math.max(1, Math.round(lesson.estimatedDuration / 60))} min`}
    </p>
  );
}
