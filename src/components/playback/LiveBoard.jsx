"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircleIcon, PlayIcon } from "lucide-react";
import { useReducedMotion, usePlayerContext } from "@/components/playback/PlayerProvider";
import ArrowFillButton from "@/components/ui/ArrowFillButton";
import BoardToolbar from "@/components/whiteboard/BoardToolbar";
import Whiteboard from "@/components/whiteboard/Whiteboard";
import { toBoardPoint, useBoardViewport } from "@/hooks/use-board-viewport";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { EASE_OUT } from "@/lib/motion";
import { elementProgress, scheduleSegment, startedActionCount } from "@/lib/playback/timeline";
import { cn } from "@/lib/utils";
import { buildBoardState } from "@/lib/whiteboard/board-state";

const noop = () => () => {};
const EMPTY = { status: "idle", segmentIndex: 0, segmentTime: 0, complete: false, durations: [] };

export default function LiveBoard({ label, fullscreenTarget }) {
  const { player, track } = usePlayerContext();
  const snap = useSyncExternalStore(
    player ? player.subscribe : noop,
    () => (player ? player.getSnapshot() : EMPTY),
    () => EMPTY
  );
  const reducedMotion = useReducedMotion();

  const actionLists = useMemo(() => track.segments.map((s) => s.visualActions), [track]);
  const durationsKey = snap.durations.join(",");
  const schedules = useMemo(
    () => track.segments.map((s, i) => scheduleSegment(s.visualActions, snap.durations[i] ?? s.estimatedDuration, s.text)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [track, durationsKey]
  );

  const position = {
    segmentIndex: snap.segmentIndex,
    segmentTime: snap.segmentTime,
    complete: snap.complete,
  };
  const actionCount = startedActionCount(schedules, position);

  const elements = useMemo(
    () => buildBoardState(actionLists, { segmentIndex: snap.segmentIndex, actionCount }).elements,
    [actionLists, snap.segmentIndex, actionCount]
  );

  const progressFor = useCallback(
    (el) => elementProgress(el, schedules, position, reducedMotion),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schedules, snap.segmentIndex, snap.segmentTime, snap.complete, reducedMotion]
  );

  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [pen, setPen] = useState(false);
  const [notes, setNotes] = useState({}); // trackId -> strokes (board coordinates)
  const [stroke, setStroke] = useState(null);
  const viewport = useBoardViewport({ svgRef, containerRef, penActive: pen });
  const fullscreen = useFullscreen(fullscreenTarget);
  const trackNotes = notes[track.id] || [];

  const penHandlers = {
    onPointerDown: (e) => {
      const p = toBoardPoint(svgRef.current, e.clientX, e.clientY);
      if (!p) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setStroke([p]);
    },
    onPointerMove: (e) => {
      if (!stroke) return;
      const p = toBoardPoint(svgRef.current, e.clientX, e.clientY);
      const last = stroke[stroke.length - 1];
      if (p && Math.hypot(p.x - last.x, p.y - last.y) > 2) setStroke([...stroke, p]);
    },
    onPointerUp: () => {
      if (stroke?.length > 1) {
        setNotes((n) => ({ ...n, [track.id]: [...(n[track.id] || []), stroke] }));
      }
      setStroke(null);
    },
  };
  penHandlers.onPointerCancel = penHandlers.onPointerUp;

  return (
    <Whiteboard
      elements={elements}
      progressFor={progressFor}
      label={label}
      viewBox={viewport.viewBox}
      svgRef={svgRef}
      containerRef={containerRef}
      className={cn(
        "group/board in-[:fullscreen]:aspect-auto! in-[:fullscreen]:min-h-0 in-[:fullscreen]:flex-1",
        pen ? "cursor-crosshair touch-none" : viewport.scale > 1 ? "cursor-grab touch-none active:cursor-grabbing" : ""
      )}
      svgProps={pen ? penHandlers : viewport.handlers}
      svgOverlay={<NotesLayer strokes={stroke ? [...trackNotes, stroke] : trackNotes} />}
    >
      <BoardOverlay snap={snap} player={player} track={track} />
      <BoardToolbar
        viewport={viewport}
        pen={pen}
        onTogglePen={() => setPen((p) => !p)}
        hasNotes={trackNotes.length > 0}
        onClearNotes={() => setNotes((n) => ({ ...n, [track.id]: [] }))}
        fullscreen={fullscreen.active}
      />
    </Whiteboard>
  );
}

function NotesLayer({ strokes }) {
  if (!strokes.length) return null;
  return (
    <g fill="none" stroke="var(--ink-orange)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {strokes.map((s, i) => (
        <path key={i} d={`M ${s.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`} />
      ))}
    </g>
  );
}

function BoardOverlay({ snap, player, track }) {
  const waiting = Boolean(player) && (snap.status === "idle" || snap.blocked);
  const buffering = Boolean(player) && !waiting && snap.status === "buffering";
  const label = snap.blocked ? "Press play to hear the lesson" : track.kind === "answer" ? "Play the answer" : "Start the lesson";

  return (
    <AnimatePresence>
      {waiting ? (
        <motion.div
          key="start"
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-board/55 backdrop-blur-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.4 } }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: "easeIn" } }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT, delay: 0.1 } }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
          >
            <ArrowFillButton size="lg" icon={PlayIcon} onClick={() => player.play()} className="shadow-(--shadow-pop)">
              {label}
            </ArrowFillButton>
          </motion.div>
          {snap.status === "idle" && snap.voice === "loading" ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.4 } }} className="text-19 text-muted-foreground">
              Getting the voice ready
            </motion.p>
          ) : null}
        </motion.div>
      ) : null}
      {buffering ? (
        <motion.div
          key="buffering"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
          className="absolute top-[2vh] right-[1vw] flex items-center gap-2 rounded-full border border-border bg-popover/90 px-3 py-1 text-17 text-muted-foreground backdrop-blur-sm max-md:right-[2vw]"
        >
          <LoaderCircleIcon className="size-4 animate-spin" />
          Loading voice
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
