"use client";

import { AnimatePresence, motion } from "motion/react";
import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";

const ICONS = {
  play: <PlayIcon className="translate-x-px fill-current" />,
  pause: <PauseIcon className="fill-current" />,
  replay: <RotateCcwIcon />,
};

export default function PlayButton({ state, disabled, onClick }) {
  const label = state === "pause" ? "Pause" : state === "replay" ? "Replay" : "Play";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
          whileTap={{ scale: 0.9 }}
          className="relative flex aspect-square h-[4.4vh] shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground outline-none transition-[background-color] duration-200 hover:bg-primary/88 focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-40 max-md:h-[3.4vh] max-sm:h-[4.8vh] [&_svg]:size-4"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={state}
              className="flex items-center justify-center"
              initial={{ scale: 0.4, opacity: 0, rotate: -60 }}
              animate={{ scale: 1, opacity: 1, rotate: 0, transition: { type: "spring", duration: 0.4, bounce: 0.3 } }}
              exit={{ scale: 0.4, opacity: 0, rotate: 60, transition: { duration: 0.12 } }}
            >
              {ICONS[state]}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent>{label} (Space)</TooltipContent>
    </Tooltip>
  );
}
