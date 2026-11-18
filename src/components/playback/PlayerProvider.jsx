"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { LessonPlayer } from "@/lib/playback/lesson-player";
import { estimateSeconds } from "@/lib/lesson/validate";
import { useTutorStore } from "@/store/tutor-store";

const PlayerContext = createContext(null);

const isTyping = (el) =>
  el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

export default function PlayerProvider({ lesson, lessonId, children }) {
  const [player] = useState(() => new LessonPlayer());
  const board = useTutorStore((s) => s.board);
  const conversation = useTutorStore((s) => s.conversation);
  const lessonPosition = useRef({ segmentIndex: 0, segmentTime: 0 });

  useEffect(() => {
    player.attach();
    return () => player.detach();
  }, [player]);

  const lessonTrack = useMemo(
    () => ({ id: `lesson:${lessonId}`, kind: "lesson", segments: lesson.segments }),
    [lesson, lessonId]
  );

  const answerTurn =
    board.kind === "answer" ? conversation.find((t) => t.id === board.messageId) : null;
  const answerTrack = useMemo(() => {
    if (!answerTurn?.visualActions?.length) return null;
    return {
      id: `answer:${answerTurn.id}`,
      kind: "answer",
      question: answerTurn.question,
      segments: [
        {
          id: "answer",
          title: "Answer",
          text: answerTurn.content,
          visualActions: answerTurn.visualActions,
          estimatedDuration: answerTurn.estimatedDuration ?? estimateSeconds(answerTurn.content),
        },
      ],
    };
  }, [answerTurn]);

  const track = answerTrack ?? lessonTrack;

  useEffect(() => {
    if (!player) return;
    return player.subscribe(() => {
      const s = player.getSnapshot();
      if (s.trackId === lessonTrack.id) {
        lessonPosition.current = { segmentIndex: s.segmentIndex, segmentTime: s.segmentTime };
      }
    });
  }, [player, lessonTrack.id]);

  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  });

  useEffect(() => {
    if (!player) return;
    if (track.kind === "answer") {
      player.load(track, { autoplay: true });
      return;
    }
    const seekTo = boardRef.current.seekTo;
    player.load(
      track,
      Number.isInteger(seekTo) ? { segmentIndex: seekTo, segmentTime: 0 } : lessonPosition.current
    );
  }, [player, track]);

  const getLessonSegmentIndex = useCallback(() => lessonPosition.current.segmentIndex, []);

  useEffect(() => {
    if (!player) return;
    const onKey = (e) => {
      const el = document.activeElement;
      if (isTyping(el) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el?.getAttribute?.("role") === "slider") return;
      if (e.key === " " || e.key === "k") {
        if (e.key === " " && (el?.tagName === "BUTTON" || el?.getAttribute?.("role") === "menuitem")) return;
        e.preventDefault();
        player.toggle();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.shiftKey ? player.skip(1) : player.seekBy(5);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.shiftKey ? player.skip(-1) : player.seekBy(-5);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player]);

  const value = useMemo(
    () => ({ player, track, lessonTrack, getLessonSegmentIndex }),
    [player, track, lessonTrack, getLessonSegmentIndex]
  );
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayerContext() {
  return useContext(PlayerContext);
}

const noopSubscribe = () => () => {};

export function usePlayerState(selector, fallback = null) {
  const ctx = useContext(PlayerContext);
  const player = ctx?.player;
  return useSyncExternalStore(
    player ? player.subscribe : noopSubscribe,
    () => (player ? selector(player.getSnapshot()) : fallback),
    () => fallback
  );
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(reducedMotionQuery);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false
  );
}
