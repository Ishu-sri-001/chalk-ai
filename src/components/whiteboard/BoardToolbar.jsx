"use client";

import { AnimatePresence, motion } from "motion/react";
import { EraserIcon, MinusIcon, PenLineIcon, PlusIcon } from "lucide-react";
import { GlideGroup, useGlideItem } from "@/components/ui/Glide";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";
import { EASE_OUT, GLIDE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function BoardToolbar({ viewport, pen, onTogglePen, hasNotes, onClearNotes, fullscreen }) {
  const inUse = pen || viewport.scale > 1 || fullscreen;
  const zoomed = viewport.scale > 1;

  return (
    <div
      className={cn(
        "absolute top-1/2 left-[1vw] -translate-y-1/2 transition-[opacity,translate] duration-300 ease-out-quint max-md:left-[2vw] max-sm:left-[3vw]",
        "focus-within:translate-x-0 focus-within:opacity-100 group-hover/board:translate-x-0 group-hover/board:opacity-100 pointer-coarse:translate-x-0 pointer-coarse:opacity-100",
        inUse ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <GlideGroup
        role="toolbar"
        aria-orientation="vertical"
        aria-label="Board tools"
        className="flex flex-col items-center gap-1 rounded-full border border-border bg-popover/90 p-1 shadow-(--shadow-card) backdrop-blur-sm"
      >
        <Tool id="pen" label={pen ? "Stop drawing" : "Draw on the board"} onClick={onTogglePen} pressed={pen}>
          <PenLineIcon />
        </Tool>
        <AnimatePresence initial={false}>
          {hasNotes ? (
            <motion.div
              key="eraser"
              initial={{ height: 0, opacity: 0, scale: 0.6 }}
              animate={{ height: "auto", opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE_OUT } }}
              exit={{ height: 0, opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
            >
              <Tool id="clear" label="Clear my notes" onClick={onClearNotes}>
                <EraserIcon />
              </Tool>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <span className="h-px w-4 bg-border" aria-hidden="true" />
        <Tool id="in" label="Zoom in" onClick={viewport.zoomIn} disabled={!viewport.canZoomIn}>
          <PlusIcon />
        </Tool>
        <AnimatePresence initial={false}>
          {zoomed ? (
            <motion.div
              key="fit"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1, transition: { duration: 0.35, ease: EASE_OUT } }}
              exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
              className="overflow-hidden"
            >
              <Tool id="fit" label={`Zoom ${Math.round(viewport.scale * 100)}%, fit the whole board`} onClick={viewport.fit}>
                <span className="font-mono text-17 tabular-nums">{Math.round(viewport.scale * 100)}</span>
              </Tool>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <Tool id="out" label="Zoom out" onClick={viewport.zoomOut} disabled={!viewport.canZoomOut}>
          <MinusIcon />
        </Tool>
      </GlideGroup>
    </div>
  );
}

function Tool({ id, label, children, pressed, className, ...props }) {
  const glide = useGlideItem(id, { className: "rounded-full" });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          {...glide.bind}
          className={cn(
            "relative isolate inline-flex aspect-square h-[4vh] items-center justify-center rounded-full text-foreground/70 outline-none transition-[color,transform] duration-200 hover:text-foreground active:scale-90 focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-35 max-md:h-[3vh] max-sm:h-[4.4vh] [&_svg]:size-[45%]",
            pressed && "text-primary-foreground hover:text-primary-foreground",
            className
          )}
          {...props}
        >
          {pressed ? (
            <motion.span layoutId="board-tool-pressed" className="absolute inset-0 -z-10 rounded-full bg-primary" transition={GLIDE} />
          ) : (
            glide.pill
          )}
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
