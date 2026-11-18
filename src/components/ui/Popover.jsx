"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { popVariants } from "@/lib/motion";

const PopoverOpenContext = React.createContext(false);

function Popover({ open: openProp, defaultOpen = false, onOpenChange, ...props }) {
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
    <PopoverOpenContext.Provider value={open}>
      <PopoverPrimitive.Root data-slot="popover" open={open} onOpenChange={setOpen} {...props} />
    </PopoverOpenContext.Provider>
  );
}

function PopoverTrigger(props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({ className, align = "center", side = "bottom", sideOffset = 10, children, ...props }) {
  const open = React.useContext(PopoverOpenContext);
  return (
    <AnimatePresence>
      {open ? (
        <PopoverPrimitive.Portal forceMount>
          <PopoverPrimitive.Content
            forceMount
            asChild
            align={align}
            side={side}
            sideOffset={sideOffset}
            collisionPadding={12}
            {...props}
          >
            <motion.div
              data-slot="popover-content"
              variants={popVariants(side)}
              initial="closed"
              animate="open"
              exit="closed"
              style={{ transformOrigin: "var(--radix-popover-content-transform-origin)" }}
              className={cn(
                "z-50 w-[22vw] rounded-xl border border-border bg-popover px-[1.4vw] py-[1.4vw] text-19 text-popover-foreground shadow-(--shadow-pop) outline-hidden max-md:w-[50vw] max-md:px-[3vw] max-md:py-[3vw] max-sm:w-[86vw] max-sm:px-[5vw] max-sm:py-[5vw]",
                className
              )}
            >
              {children}
            </motion.div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
