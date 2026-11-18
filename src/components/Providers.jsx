"use client";

import { MotionConfig } from "motion/react";
import { TooltipProvider } from "@/components/ui/Tooltip";

export default function Providers({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={350} skipDelayDuration={250}>
        {children}
      </TooltipProvider>
    </MotionConfig>
  );
}
