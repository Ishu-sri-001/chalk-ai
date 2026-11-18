"use client";

import { motion } from "motion/react";
import { BOARD } from "@/lib/lesson/constants";
import { EASE_OUT } from "@/lib/motion";

// The board keeps its 16:9 shape as a minimum, not a fixed size: an invisible
// spacer and the content share one grid cell, so the frame grows taller when
// the content needs more room (narrow phones, long topics, wrapped text)
// instead of clipping it.
//
// The spacer must take its width from the frame (w-full) and must not stretch
// to the row height (self-start). Otherwise, when content is taller than 16:9,
// the stretched height feeds back through aspect-ratio into a width wider than
// the frame, the column grows past the card and everything overflows sideways.
// grid-cols-1 (minmax(0, 1fr)) caps the column at the frame width as a backstop.
export default function BoardFrame({ children, label }) {
  return (
    <div
      className="board-surface grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-board-edge text-center shadow-(--shadow-board)"
      role="status"
      aria-label={label}
    >
      <div
        aria-hidden="true"
        className="col-start-1 row-start-1 w-full self-start"
        style={{ aspectRatio: `${BOARD.width} / ${BOARD.height}` }}
      />
      <div className="col-start-1 row-start-1 flex min-w-0 flex-col items-center justify-center px-[4vw] py-10 max-md:px-[6vw] max-sm:px-[5vw] max-sm:py-8">
        <motion.div
          className="flex w-full flex-col items-center gap-[3vh] max-md:gap-[2vh]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT, delay: 0.1 } }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
