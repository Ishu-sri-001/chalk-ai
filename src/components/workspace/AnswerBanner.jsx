"use client";

import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeftIcon, MessageCircleQuestionIcon } from "lucide-react";
import CharStaggerButton from "@/components/ui/CharStaggerButton";
import { EASE_OUT } from "@/lib/motion";
import { useTutorStore } from "@/store/tutor-store";

export default function AnswerBanner({ track }) {
  const showLessonBoard = useTutorStore((s) => s.showLessonBoard);
  return (
    <AnimatePresence initial={false}>
      {track.kind === "answer" ? (
        <motion.div
          key="answer"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1, transition: { duration: 0.45, ease: EASE_OUT } }}
          exit={{ height: 0, opacity: 0, transition: { duration: 0.25 } }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 py-[1.4vh]">
            <MessageCircleQuestionIcon className="size-4 shrink-0 text-brand" strokeWidth={1.6} aria-hidden="true" />
            <p className="min-w-0 flex-1 truncate text-19 text-muted-foreground">
              Sketch for your question: <span className="text-foreground">{track.question}</span>
            </p>
            <CharStaggerButton icon={CornerDownLeftIcon} line onClick={() => showLessonBoard()}>
              Back to lesson
            </CharStaggerButton>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
