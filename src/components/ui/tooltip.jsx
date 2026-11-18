"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";

const TooltipOpenContext = React.createContext(false);

function TooltipProvider({ delayDuration = 300, ...props }) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

function Tooltip({ open: openProp, defaultOpen = false, onOpenChange, ...props }) {
  const [own, setOwn] = React.useState(defaultOpen);
  const open = openProp ?? own;
  const setOpen = React.useCallback(
    (next) => {
      setOwn(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );
  return (
    <TooltipOpenContext.Provider value={open}>
      <TooltipPrimitive.Root data-slot="tooltip" open={open} onOpenChange={setOpen} {...props} />
    </TooltipOpenContext.Provider>
  );
}

function TooltipTrigger(props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

const lift = { top: { y: 4 }, bottom: { y: -4 }, left: { x: 4 }, right: { x: -4 } };

function TooltipContent({ className, side = "top", sideOffset = 8, children, ...props }) {
  const open = React.useContext(TooltipOpenContext);
  return (
    <AnimatePresence>
      {open ? (
        <TooltipPrimitive.Portal forceMount>
          <TooltipPrimitive.Content forceMount asChild side={side} sideOffset={sideOffset} {...props}>
            <motion.div
              data-slot="tooltip-content"
              initial={{ opacity: 0, scale: 0.94, ...lift[side] }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0, transition: { duration: 0.22, ease: EASE_OUT } }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
              style={{ transformOrigin: "var(--radix-tooltip-content-transform-origin)" }}
              className={cn(
                "z-50 w-fit rounded-md bg-foreground px-2.5 py-1 text-17 font-medium text-background",
                className
              )}
            >
              {children}
            </motion.div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
