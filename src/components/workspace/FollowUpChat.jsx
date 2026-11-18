"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRightIcon, PresentationIcon, RefreshCwIcon, Undo2Icon } from "lucide-react";
import { usePlayerContext } from "@/components/playback/PlayerProvider";
import CharStaggerButton from "@/components/ui/CharStaggerButton";
import Composer from "@/components/ui/Composer";
import { GlideGroup, useGlideItem } from "@/components/ui/Glide";
import StaggerText from "@/components/ui/StaggerText";
import { LIMITS } from "@/lib/lesson/constants";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useTutorStore } from "@/store/tutor-store";

const turnMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

export default function FollowUpChat({ lesson }) {
  const conversation = useTutorStore((s) => s.conversation);
  const status = useTutorStore((s) => s.followUpStatus);
  const askFollowUp = useTutorStore((s) => s.askFollowUp);
  const { player, getLessonSegmentIndex } = usePlayerContext();
  const scrollRef = useRef(null);

  const ask = (q) => {
    player?.pause();
    askFollowUp(q, getLessonSegmentIndex());
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [conversation]);

  const lastTutor = [...conversation].reverse().find((t) => t.role === "tutor" && t.status === "done");
  const suggestions = (conversation.length === 0 ? lesson.followUpQuestions : lastTutor?.suggestions ?? []) ?? [];
  const showSuggestions = suggestions.length > 0 && status !== "pending";

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div
        ref={scrollRef}
        className={cn("scrollbar-quiet min-h-0 overflow-y-auto overscroll-contain py-[1vh]", conversation.length > 0 && "flex-1")}
      >
        {conversation.length > 0 ? (
          <ul className="flex flex-col gap-5" aria-live="polite">
            {conversation.map((turn) => (
              <motion.li key={turn.id} {...turnMotion}>
                {turn.role === "learner" ? <LearnerTurn turn={turn} /> : <TutorTurn turn={turn} />}
              </motion.li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-2">
            <h3 className="text-30 text-foreground">Curious about something?</h3>
            <p className="text-19 text-muted-foreground">
              Ask about anything in this lesson. Chalk knows which part you&apos;re on and can sketch and talk through
              an answer.
            </p>
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showSuggestions ? (
          <motion.div
            key={suggestions.join("|")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="flex flex-col gap-1.5"
          >
            <h3 className="text-19 text-muted-foreground">Try asking</h3>
            <GlideGroup className="flex flex-col">
              {suggestions.slice(0, 3).map((q) => (
                <Suggestion key={q} question={q} onAsk={ask} />
              ))}
            </GlideGroup>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Composer
        size="sm"
        label="Ask a follow-up question"
        placeholder="Ask a follow-up question…"
        submitLabel="Ask"
        maxLength={LIMITS.questionMaxChars}
        busy={status === "pending"}
        onSubmit={ask}
      />
    </div>
  );
}

function Suggestion({ question, onAsk }) {
  const glide = useGlideItem(question, { className: "rounded-lg" });
  return (
    <button
      type="button"
      onClick={() => onAsk(question)}
      {...glide.bind}
      className="stagger-trigger relative isolate flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-19 text-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      {glide.pill}
      <StaggerText text={question} step={0} className="flex-1" />
      <span className="flex h-[1lh] shrink-0 items-center" aria-hidden="true">
        <ArrowUpRightIcon
          className={cn(
            "size-4 transition-[opacity,transform] duration-500 ease-out-quint",
            glide.on ? "opacity-80" : "-translate-x-0.5 translate-y-0.5 opacity-0"
          )}
        />
      </span>
    </button>
  );
}

function LearnerTurn({ turn }) {
  return (
    <div className="grid grid-cols-[15%_1fr]">
      <p className="col-start-2 w-fit justify-self-end rounded-2xl rounded-br-md bg-foreground/5 px-3.5 py-2 text-19 text-foreground">
        {turn.content}
      </p>
    </div>
  );
}

function TutorTurn({ turn }) {
  const board = useTutorStore((s) => s.board);
  const showAnswerOnBoard = useTutorStore((s) => s.showAnswerOnBoard);
  const showLessonBoard = useTutorStore((s) => s.showLessonBoard);
  const retryFollowUp = useTutorStore((s) => s.retryFollowUp);
  const { getLessonSegmentIndex } = usePlayerContext();
  const retry = (id) => retryFollowUp(id, getLessonSegmentIndex());

  if (turn.status === "pending") {
    return (
      <div className="flex items-center gap-2.5 py-1 text-19 text-muted-foreground" role="status">
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1 rounded-full bg-brand"
              animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
            />
          ))}
        </span>
        Thinking about your question
      </div>
    );
  }

  if (turn.status === "error") {
    return (
      <div className="flex flex-col items-start gap-1 text-19">
        <p className="text-destructive">{turn.content}</p>
        <CharStaggerButton icon={RefreshCwIcon} line onClick={() => retry(turn.id)}>
          Ask again
        </CharStaggerButton>
      </div>
    );
  }

  const onBoard = board.kind === "answer" && board.messageId === turn.id;
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-17 font-medium text-brand">Chalk</span>
      <p className="text-19 text-foreground">{turn.content}</p>
      {turn.visualActions?.length ? (
        <CharStaggerButton
          icon={onBoard ? Undo2Icon : PresentationIcon}
          tone={onBoard ? "brand" : "default"}
          line
          onClick={() => (onBoard ? showLessonBoard() : showAnswerOnBoard(turn.id))}
        >
          {onBoard ? "Back to the lesson" : "Replay the sketch"}
        </CharStaggerButton>
      ) : null}
    </div>
  );
}
