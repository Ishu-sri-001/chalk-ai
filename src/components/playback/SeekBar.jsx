"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePlayerContext, usePlayerState } from "@/components/playback/PlayerProvider";
import { formatTime } from "@/lib/playback/timeline";
import { cn } from "@/lib/utils";

export default function SeekBar() {
  const { player, track } = usePlayerContext();
  const time = usePlayerState((s) => s.time, 0);
  const total = usePlayerState((s) => s.total, 0);
  const starts = usePlayerState((s) => s.starts, []);
  const durations = usePlayerState((s) => s.durations, []);
  const segmentIndex = usePlayerState((s) => s.segmentIndex, 0);
  const ref = useRef(null);
  const drag = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(null); // fraction 0..1 under the pointer

  const fractionAt = (clientX) => {
    const rect = ref.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };
  const timeAt = (clientX) => fractionAt(clientX) * total;

  const onPointerDown = (e) => {
    if (!player || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const snap = player.getSnapshot();
    drag.current = { resume: snap.status === "playing" || snap.status === "buffering" };
    setDragging(true);
    player.pause();
    player.seek(timeAt(e.clientX));
  };
  const onPointerMove = (e) => {
    if (e.pointerType === "mouse") setHover(fractionAt(e.clientX));
    if (!drag.current) return;
    player.seek(timeAt(e.clientX));
  };
  const onPointerUp = (e) => {
    if (!drag.current) return;
    player.seek(timeAt(e.clientX));
    if (drag.current.resume) player.play();
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (e) => {
    if (!player) return;
    const actions = {
      ArrowRight: () => player.seekBy(5),
      ArrowUp: () => player.seekBy(5),
      ArrowLeft: () => player.seekBy(-5),
      ArrowDown: () => player.seekBy(-5),
      PageUp: () => player.skip(1),
      PageDown: () => player.skip(-1),
      Home: () => player.seek(0),
      End: () => player.seek(total),
    };
    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
    }
  };

  const segment = track.segments[segmentIndex];
  const hoverTime = hover === null ? null : hover * total;
  const hoverPart = hoverTime === null ? -1 : starts.findLastIndex((s) => s <= hoverTime);
  const hoverTitle = hoverPart >= 0 ? track.segments[hoverPart]?.title : null;
  const active = dragging || hover !== null;

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Lesson position"
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={`${formatTime(time)} of ${formatTime(total)}${segment ? `, ${segment.title}` : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
      className="group/seek relative flex h-[4vh] min-w-0 flex-1 cursor-pointer touch-none items-center gap-1 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/35 max-md:h-[3vh] max-sm:h-[4.4vh]"
    >
      {durations.map((d, i) => {
        const fill = Math.min(1, Math.max(0, (time - starts[i]) / (d || 1)));
        return (
          <div
            key={i}
            style={{ flexGrow: d, flexBasis: 0 }}
            className={cn(
              "relative h-0.5 overflow-hidden rounded-full bg-foreground/12 transition-[height] duration-300 ease-out-quint",
              active && "h-1",
              hoverPart === i && !dragging && "bg-foreground/20"
            )}
          >
            <div className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-foreground/85" style={{ transform: `scaleX(${fill})` }} />
          </div>
        );
      })}

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-3 ring-board transition-transform duration-300 ease-out-quint",
          dragging ? "scale-125" : active ? "scale-100" : "scale-0 group-focus-visible/seek:scale-100"
        )}
        style={{ left: `${total ? (time / total) * 100 : 0}%` }}
      />

      <AnimatePresence>
        {hoverTime !== null && !dragging ? (
          <motion.div
            key="preview"
            aria-hidden="true"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.18 } }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
            className="pointer-events-none absolute bottom-full z-10 -translate-x-1/2 -translate-y-2 rounded-md bg-foreground px-2 py-1 text-17 whitespace-nowrap text-background"
            style={{ left: `${hover * 100}%` }}
          >
            <span className="font-mono tabular-nums">{formatTime(hoverTime)}</span>
            {hoverTitle ? <span className="text-background/70"> · {hoverTitle}</span> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
