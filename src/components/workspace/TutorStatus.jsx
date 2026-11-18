"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePlayerState } from "@/components/playback/PlayerProvider";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useTutorStore } from "@/store/tutor-store";

const STATUS_TEXT = {
  generating: "Writing your lesson",
  error: "Waiting for a topic",
  ready: "Ready to teach",
  idle: "Waiting for a topic",
};

const PLAYBACK_TEXT = {
  playing: "Teaching",
  buffering: "Getting the voice ready",
  paused: "Paused",
  ended: "Lesson complete",
};

export default function TutorStatus() {
  const lessonStatus = useTutorStore((s) => s.status);
  const meta = useTutorStore((s) => s.lessonMeta);
  const playback = usePlayerState((s) => s.status, null);
  const voiceOff = usePlayerState((s) => (s.voice === "unavailable" || s.voice === "quota") && !s.deviceVoice, false);
  const playing = playback === "playing" || playback === "buffering";
  const status = lessonStatus === "ready" && playback && playback !== "idle" ? "ready" : lessonStatus;
  const statusText =
    lessonStatus === "ready" && PLAYBACK_TEXT[playback]
      ? `${PLAYBACK_TEXT[playback]}${playback === "playing" && voiceOff ? " (captions only)" : ""}`
      : STATUS_TEXT[lessonStatus];

  return (
    <div className="flex items-center gap-2.5 text-19">
      <span className="relative flex size-2 items-center justify-center" aria-hidden="true">
        {playing || status === "generating" ? (
          <span className={cn("absolute inset-0 animate-ping rounded-full opacity-50", status === "generating" ? "bg-brand" : "bg-ink-green")} />
        ) : null}
        <span
          className={cn(
            "relative size-1.5 rounded-full transition-colors duration-500",
            status === "ready" && "bg-ink-green",
            status === "generating" && "bg-brand",
            (status === "error" || status === "idle") && "bg-muted-foreground/40"
          )}
        />
      </span>
      <span className="relative h-[1lh] flex-1 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={statusText}
            className="absolute inset-0 truncate text-foreground/85"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } }}
            exit={{ y: "-100%", opacity: 0, transition: { duration: 0.25 } }}
          >
            {statusText}
          </motion.span>
        </AnimatePresence>
      </span>
      {meta?.model ? (
        <span className="w-[40%] truncate text-right font-mono text-17 text-muted-foreground" title="Model that wrote this lesson">
          {meta.model}
        </span>
      ) : null}
    </div>
  );
}
