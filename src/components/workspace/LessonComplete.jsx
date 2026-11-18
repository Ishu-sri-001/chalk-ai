"use client";

import { AnimatePresence, motion } from "motion/react";
import { RotateCcwIcon } from "lucide-react";
import { usePlayerContext, usePlayerState } from "@/components/playback/PlayerProvider";
import ArrowFillButton from "@/components/ui/ArrowFillButton";
import CharStaggerButton from "@/components/ui/CharStaggerButton";
import { EASE_OUT } from "@/lib/motion";
import { useTutorStore } from "@/store/tutor-store";

export default function LessonComplete({ lesson }) {
  const { player, track } = usePlayerContext();
  const ended = usePlayerState((s) => s.status === "ended", false);
  const startLesson = useTutorStore((s) => s.startLesson);
  const setPanelTab = useTutorStore((s) => s.setPanelTab);
  const show = ended && track.kind === "lesson";
  const related = lesson.relatedTopics ?? [];

  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          key="complete"
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1, transition: { duration: 0.6, ease: EASE_OUT } }}
          exit={{ height: 0, opacity: 0, transition: { duration: 0.25 } }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-4 border-b border-hairline py-[3vh] max-md:py-[2.4vh]">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <p className="flex items-center gap-3">
                <DrawnCheck />
                <span className="font-heading text-30 font-medium text-foreground">Lesson complete.</span>
                <span className="text-19 text-muted-foreground max-sm:hidden">Replay it, or ask about any part.</span>
              </p>
              <div className="flex gap-2">
                <ArrowFillButton size="sm" variant="outline" icon={RotateCcwIcon} onClick={() => player.restart()}>
                  Replay
                </ArrowFillButton>
                <ArrowFillButton size="sm" onClick={() => setPanelTab("ask")}>
                  Ask a question
                </ArrowFillButton>
              </div>
            </div>
            {related.length ? (
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <h3 className="text-19 text-muted-foreground">Keep going</h3>
                {related.map((topic, i) => (
                  <motion.span
                    key={topic}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.25 + i * 0.06, duration: 0.5, ease: EASE_OUT } }}
                  >
                    <CharStaggerButton size="md" underline arrow step={0} onClick={() => startLesson(topic)}>
                      {topic}
                    </CharStaggerButton>
                  </motion.span>
                ))}
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DrawnCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 shrink-0 text-brand"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1, transition: { duration: 0.7, ease: EASE_OUT, delay: 0.1 } }}
      />
      <motion.path
        d="M7.5 12.5l3 3 6-6.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1, transition: { duration: 0.45, ease: EASE_OUT, delay: 0.55 } }}
      />
    </svg>
  );
}
