"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE_OUT, GLIDE } from "@/lib/motion";

const TabsContext = React.createContext(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs parts must be used inside <Tabs>.");
  return ctx;
}

function Tabs({ value, onValueChange, className, children }) {
  const id = React.useId();
  const order = React.useRef([]);
  const [direction, setDirection] = React.useState(1);

  const select = React.useCallback(
    (next) => {
      if (next === value) return;
      const list = order.current;
      setDirection(list.indexOf(next) >= list.indexOf(value) ? 1 : -1);
      onValueChange(next);
    },
    [value, onValueChange]
  );

  const ctx = React.useMemo(() => ({ id, value, select, direction, order }), [id, value, select, direction]);

  return (
    <TabsContext.Provider value={ctx}>
      <div data-slot="tabs" className={cn("flex min-h-0 flex-col", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, children, label }) {
  const { order, select, value } = useTabs();
  const ref = React.useRef(null);

  const onKeyDown = (e) => {
    const list = order.current;
    const i = list.indexOf(value);
    const next =
      e.key === "ArrowRight" ? list[(i + 1) % list.length]
      : e.key === "ArrowLeft" ? list[(i - 1 + list.length) % list.length]
      : e.key === "Home" ? list[0]
      : e.key === "End" ? list[list.length - 1]
      : null;
    if (!next) return;
    e.preventDefault();
    select(next);
    ref.current?.querySelector(`[data-value="${CSS.escape(next)}"]`)?.focus();
  };

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("relative flex items-center gap-1 rounded-full bg-foreground/4 p-1", className)}
    >
      {children}
    </div>
  );
}

function TabsTrigger({ value, className, children }) {
  const ctx = useTabs();
  const active = ctx.value === value;

  if (!ctx.order.current.includes(value)) ctx.order.current.push(value);

  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.id}-tab-${value}`}
      aria-selected={active}
      aria-controls={`${ctx.id}-panel-${value}`}
      tabIndex={active ? 0 : -1}
      data-value={value}
      onClick={() => ctx.select(value)}
      className={cn(
        "relative flex h-[4.4vh] flex-1 items-center justify-center gap-1.5 rounded-full px-[1vw] text-19 font-medium whitespace-nowrap outline-none max-md:h-[3.4vh] max-md:px-[2vw] max-sm:h-[4.8vh] max-sm:px-[3vw]",
        "transition-colors duration-300 focus-visible:ring-3 focus-visible:ring-ring/35 [&_svg]:size-4",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {active ? (
        <motion.span
          aria-hidden="true"
          layoutId={`${ctx.id}-pill`}
          className="absolute inset-0 rounded-full bg-popover shadow-xs ring-1 ring-border"
          transition={GLIDE}
        />
      ) : null}
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </button>
  );
}

function TabsPanels({ className, children }) {
  return (
    <div className={cn("grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] [grid-template-areas:'stack']", className)}>
      {children}
    </div>
  );
}

const DISTANCE = 18;

function TabsContent({ value, className, children }) {
  const { id, value: current, direction } = useTabs();
  const active = current === value;

  return (
    <motion.div
      role="tabpanel"
      id={`${id}-panel-${value}`}
      aria-labelledby={`${id}-tab-${value}`}
      aria-hidden={!active}
      inert={!active}
      initial={false}
      animate={
        active
          ? {
              opacity: [0, 1],
              x: [direction * DISTANCE, 0],
              visibility: "visible",
              transition: { duration: 0.45, ease: EASE_OUT, delay: 0.06 },
            }
          : {
              opacity: 0,
              x: -direction * DISTANCE,
              transition: { duration: 0.2, ease: "easeIn" },
              transitionEnd: { visibility: "hidden" },
            }
      }
      className={cn("min-h-0 min-w-0 [grid-area:stack]", className)}
    >
      {children}
    </motion.div>
  );
}

export { Tabs, TabsContent, TabsList, TabsPanels, TabsTrigger };
