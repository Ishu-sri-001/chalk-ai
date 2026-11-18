"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { GLIDE, POP_IN, popVariants, rowVariants } from "@/lib/motion";

const MenuContext = React.createContext(null);
const PILL_RELEASE_MS = 140;

function useMenu() {
  const ctx = React.useContext(MenuContext);
  if (!ctx) throw new Error("Dropdown menu parts must be used inside <DropdownMenu>.");
  return ctx;
}

function DropdownMenu({ open: openProp, defaultOpen = false, onOpenChange, children, ...props }) {
  const id = React.useId();
  const [own, setOwn] = React.useState(defaultOpen);
  const open = openProp ?? own;
  const [active, setActiveState] = React.useState(null);
  const timer = React.useRef(0);

  const setOpen = React.useCallback(
    (next) => {
      setOwn(next);
      if (!next) setActiveState(null);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );
  const setActive = React.useCallback((value) => {
    window.clearTimeout(timer.current);
    setActiveState(value);
  }, []);
  const release = React.useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActiveState(null), PILL_RELEASE_MS);
  }, []);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = React.useMemo(() => ({ id, open, active, setActive, release }), [id, open, active, setActive, release]);

  return (
    <MenuContext.Provider value={value}>
      <DropdownMenuPrimitive.Root data-slot="dropdown-menu" open={open} onOpenChange={setOpen} {...props}>
        {children}
      </DropdownMenuPrimitive.Root>
    </MenuContext.Provider>
  );
}

function DropdownMenuTrigger(props) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 10,
  stagger = true,
  children,
  ...props
}) {
  const { open } = useMenu();
  const variants = React.useMemo(() => {
    const v = popVariants(side);
    return stagger ? v : { ...v, open: { ...v.open, transition: POP_IN } };
  }, [side, stagger]);

  return (
    <AnimatePresence>
      {open ? (
        <DropdownMenuPrimitive.Portal forceMount>
          <DropdownMenuPrimitive.Content
            forceMount
            asChild
            side={side}
            align={align}
            sideOffset={sideOffset}
            collisionPadding={12}
            {...props}
          >
            <motion.div
              data-slot="dropdown-menu-content"
              layoutScroll
              variants={variants}
              initial="closed"
              animate="open"
              exit="closed"
              style={{ transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)" }}
              className={cn(
                "scrollbar-quiet z-50 flex max-h-(--radix-dropdown-menu-content-available-height) min-w-40 flex-col gap-0.5 overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-(--shadow-pop) outline-hidden",
                className
              )}
            >
              {children}
            </motion.div>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  );
}

function useRowHighlight() {
  const { id, active, setActive, release } = useMenu();
  const rowId = React.useId();
  return {
    on: active === rowId,
    pill: (
      <AnimatePresence initial={false}>
        {active === rowId ? (
          <motion.span
            key="pill"
            aria-hidden="true"
            layoutId={`${id}-pill`}
            className="absolute inset-0 -z-10 rounded-lg bg-(--glide-strong)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={GLIDE}
          />
        ) : null}
      </AnimatePresence>
    ),
    handlers: {
      onFocus: () => setActive(rowId),
      onBlur: release,
    },
  };
}

const rowClass =
  "relative isolate flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-19 outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

function DropdownMenuItem({ className, children, onFocus, onBlur, ...props }) {
  const { pill, handlers } = useRowHighlight();
  return (
    <DropdownMenuPrimitive.Item asChild {...props}>
      <motion.div
        data-slot="dropdown-menu-item"
        variants={rowVariants}
        onFocus={(e) => {
          handlers.onFocus();
          onFocus?.(e);
        }}
        onBlur={(e) => {
          handlers.onBlur();
          onBlur?.(e);
        }}
        className={cn(rowClass, className)}
      >
        {pill}
        {children}
      </motion.div>
    </DropdownMenuPrimitive.Item>
  );
}

function DropdownMenuRadioGroup(props) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({ className, children, ...props }) {
  const { pill, handlers } = useRowHighlight();
  return (
    <DropdownMenuPrimitive.RadioItem asChild {...props}>
      <motion.div
        data-slot="dropdown-menu-radio-item"
        variants={rowVariants}
        {...handlers}
        className={cn(rowClass, className)}
      >
        {pill}
        {children}
        <span className="pointer-events-none flex size-4 shrink-0 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator forceMount asChild>
            <RadioTick />
          </DropdownMenuPrimitive.ItemIndicator>
        </span>
      </motion.div>
    </DropdownMenuPrimitive.RadioItem>
  );
}

const RadioTick = React.forwardRef(function RadioTick(props, ref) {
  const checked = props["data-state"] === "checked";
  return (
    <span ref={ref} {...props} className="text-brand">
      <motion.svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.svg>
    </span>
  );
});

function DropdownMenuLabel({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.Label asChild>
      <motion.div
        data-slot="dropdown-menu-label"
        variants={rowVariants}
        className={cn("px-2.5 py-1.5 text-17 text-muted-foreground", className)}
        {...props}
      />
    </DropdownMenuPrimitive.Label>
  );
}

function DropdownMenuSeparator({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("h-px shrink-0 bg-hairline", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
