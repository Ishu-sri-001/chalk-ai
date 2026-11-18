"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { GLIDE } from "@/lib/motion";

const GlideContext = React.createContext(null);
const RELEASE_MS = 120;

export function GlideGroup({ as: Comp = "div", className, children, onPointerLeave, ...props }) {
  const id = React.useId();
  const [active, setActiveState] = React.useState(null);
  const timer = React.useRef(0);

  const setActive = React.useCallback((value) => {
    window.clearTimeout(timer.current);
    setActiveState(value);
  }, []);
  const release = React.useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActiveState(null), RELEASE_MS);
  }, []);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = React.useMemo(() => ({ id, active, setActive, release }), [id, active, setActive, release]);

  return (
    <GlideContext.Provider value={value}>
      <Comp
        className={className}
        onPointerLeave={(e) => {
          release();
          onPointerLeave?.(e);
        }}
        {...props}
      >
        {children}
      </Comp>
    </GlideContext.Provider>
  );
}

export function useGlideItem(value, { className } = {}) {
  const ctx = React.useContext(GlideContext);
  const on = ctx?.active === value;
  return {
    on,
    bind: ctx
      ? {
          onPointerEnter: () => ctx.setActive(value),
          onFocus: () => ctx.setActive(value),
          onBlur: ctx.release,
        }
      : {},
    pill: ctx ? (
      <AnimatePresence initial={false}>
        {on ? (
          <motion.span
            key="pill"
            aria-hidden="true"
            layoutId={`${ctx.id}-glide`}
            className={cn("pointer-events-none absolute inset-0 -z-10 rounded-xl bg-(--glide)", className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            transition={GLIDE}
          />
        ) : null}
      </AnimatePresence>
    ) : null,
  };
}
