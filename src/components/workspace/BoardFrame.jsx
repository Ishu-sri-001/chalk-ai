"use client";

import { motion } from "motion/react";
import { BOARD } from "@/lib/lesson/constants";
import { EASE_OUT } from "@/lib/motion";

export default function BoardFrame({ children, label }) {
  return (
    <div
      className="board-surface relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-board-edge px-[4vw] text-center shadow-(--shadow-board) max-md:px-[6vw] max-sm:px-[5vw]"
      style={{ aspectRatio: `${BOARD.width} / ${BOARD.height}` }}
      role="status"
      aria-label={label}
    >
      <motion.div
        className="flex flex-col items-center gap-[3vh] max-md:gap-[2vh]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT, delay: 0.1 } }}
      >
        {children}
      </motion.div>
    </div>
  );
}
