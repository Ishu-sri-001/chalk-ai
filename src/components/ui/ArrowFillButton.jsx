"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, LoaderCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = "ease-[cubic-bezier(0.785,0.135,0.15,0.86)]";
const DURATION_MS = 450;

const SIZES = {
  sm: "text-19 [--afb-h:4.4vh] max-md:[--afb-h:3.4vh] max-sm:[--afb-h:4.8vh]",
  md: "text-19 [--afb-h:5.2vh] max-md:[--afb-h:4vh] max-sm:[--afb-h:5.6vh]",
  lg: "text-21 [--afb-h:6.4vh] max-md:[--afb-h:4.8vh] max-sm:[--afb-h:6.8vh]",
};

const VARIANTS = {
  solid:
    "[--afb-bg:var(--brand)] [--afb-text:var(--brand-foreground)] [--afb-fill:var(--primary)] [--afb-fill-text:var(--primary-foreground)]",
  outline:
    "border border-border [--afb-bg:transparent] [--afb-text:var(--foreground)] [--afb-fill:var(--primary)] [--afb-fill-text:var(--primary-foreground)]",
};

const GEOMETRY =
  "[--afb-circle:calc(var(--afb-h)*0.8)] [--afb-pad:calc(var(--afb-h)*0.1)] [--afb-inset:calc((100%-var(--afb-circle))/2)_var(--afb-pad)_calc((100%-var(--afb-circle))/2)_calc(100%-var(--afb-pad)-var(--afb-circle))]";

const FILL_ON =
  "group-hover/afb:inset-0 group-focus-visible/afb:inset-0 group-data-[pressed=true]/afb:inset-0";
const LABEL_ON =
  "group-hover/afb:[clip-path:inset(0_0_0_0)] group-focus-visible/afb:[clip-path:inset(0_0_0_0)] group-data-[pressed=true]/afb:[clip-path:inset(0_0_0_0)]";
const ARROW_IN_ON =
  "group-hover/afb:-translate-x-1/2 group-hover/afb:scale-100 group-focus-visible/afb:-translate-x-1/2 group-focus-visible/afb:scale-100 group-data-[pressed=true]/afb:-translate-x-1/2 group-data-[pressed=true]/afb:scale-100";
const ARROW_OUT_ON =
  "group-hover/afb:translate-x-[70%] group-hover/afb:scale-0 group-focus-visible/afb:translate-x-[70%] group-focus-visible/afb:scale-0 group-data-[pressed=true]/afb:translate-x-[70%] group-data-[pressed=true]/afb:scale-0";

const ROW = "flex h-full items-center gap-[calc(var(--afb-h)*0.1)] px-(--afb-pad)";
const LABEL = "px-[calc(var(--afb-h)*0.3)] leading-none whitespace-nowrap";

export default function ArrowFillButton({
  as: Comp = "button",
  variant = "solid",
  size = "md",
  icon: Icon = ArrowRightIcon,
  busy = false,
  collapseOnMobile = false,
  className,
  children,
  type,
  ref,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...props
}) {
  const [pressed, setPressed] = useState(false);
  const release = useRef(0);
  useEffect(() => () => window.clearTimeout(release.current), []);

  const touch = (handler, down) => (e) => {
    handler?.(e);
    if (e.pointerType === "mouse") return;
    window.clearTimeout(release.current);
    if (down) setPressed(true);
    else release.current = window.setTimeout(() => setPressed(false), DURATION_MS);
  };

  const transition = `transition-all duration-450 ${EASE} motion-reduce:transition-none`;
  const label = cn(LABEL, collapseOnMobile && "max-sm:sr-only");

  return (
    <Comp
      ref={ref}
      type={Comp === "button" ? (type ?? "button") : type}
      data-slot="arrow-fill-button"
      data-pressed={pressed ? "true" : "false"}
      onPointerDown={touch(onPointerDown, true)}
      onPointerUp={touch(onPointerUp, false)}
      onPointerCancel={touch(onPointerCancel, false)}
      className={cn(
        "group/afb relative isolate inline-flex h-(--afb-h) w-fit shrink-0 overflow-hidden rounded-full bg-(--afb-bg) font-medium text-(--afb-text) outline-none select-none",
        "transition-[transform,opacity] duration-200 active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:opacity-35 aria-disabled:pointer-events-none aria-disabled:opacity-35",
        GEOMETRY,
        SIZES[size],
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      <span className={cn(ROW, "relative z-1")}>
        <span className={label}>{children}</span>
        <span aria-hidden="true" className="aspect-square h-(--afb-circle) shrink-0" />
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-(--afb-inset) z-2 rounded-full bg-(--afb-fill)",
          transition,
          FILL_ON
        )}
      />

      <span
        aria-hidden="true"
        className={cn(
          ROW,
          "pointer-events-none absolute inset-0 z-2 text-(--afb-fill-text) [clip-path:inset(var(--afb-inset))]",
          transition,
          LABEL_ON,
          collapseOnMobile && "max-sm:hidden"
        )}
      >
        <span className={LABEL}>{children}</span>
        <span className="aspect-square h-(--afb-circle) shrink-0" />
      </span>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-(--afb-pad) z-3 inline-flex aspect-square h-(--afb-circle) -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-(--afb-fill) text-(--afb-fill-text) [&_[data-afb-icon]]:size-[45%]"
      >
        {busy ? (
          <LoaderCircleIcon data-afb-icon className="animate-spin" strokeWidth={1.8} />
        ) : (
          <>
            <Icon
              data-afb-icon
              strokeWidth={1.8}
              className={cn(
                "absolute top-1/2 left-1/2 origin-center -translate-x-[170%] -translate-y-1/2 scale-0",
                `transition-transform duration-450 ${EASE} motion-reduce:transition-none`,
                ARROW_IN_ON
              )}
            />
            <Icon
              data-afb-icon
              strokeWidth={1.8}
              className={cn(
                "absolute top-1/2 left-1/2 origin-center -translate-x-1/2 -translate-y-1/2",
                `transition-transform duration-450 ${EASE} motion-reduce:transition-none`,
                ARROW_OUT_ON
              )}
            />
          </>
        )}
      </span>
    </Comp>
  );
}
