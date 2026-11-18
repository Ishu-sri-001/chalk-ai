"use client";

import { ArrowRightIcon } from "lucide-react";
import StaggerText from "@/components/ui/StaggerText";
import { cn } from "@/lib/utils";

const TONES = {
  default: "text-foreground",
  muted: "text-muted-foreground hover:text-foreground focus-visible:text-foreground aria-expanded:text-foreground",
  brand: "text-brand",
  danger: "text-destructive",
};

const SIZES = {
  xs: "gap-1.5 text-17",
  sm: "gap-1.5 text-19",
  md: "gap-2 text-21",
};

export default function CharStaggerButton({
  as: Comp = "button",
  text,
  children,
  icon: Icon,
  arrow = false,
  line = false,
  underline = false,
  tone = "default",
  size = "sm",
  step,
  textClassName,
  className,
  type,
  ref,
  ...props
}) {
  const label = typeof children === "string" ? children : text;
  return (
    <Comp
      ref={ref}
      type={Comp === "button" ? (type ?? "button") : type}
      data-slot="char-stagger-button"
      className={cn(
        "stagger-trigger group/stagger relative inline-flex w-fit shrink-0 items-center rounded-sm whitespace-nowrap outline-none select-none [&_svg]:size-4",
        "transition-[color,opacity,transform] duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-40",
        TONES[tone],
        SIZES[size],
        className
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" strokeWidth={1.7} className="shrink-0" /> : null}
      <span className={cn("relative inline-block", textClassName)}>
        {label !== undefined ? <StaggerText text={label} step={step} /> : children}
        {underline ? <span aria-hidden="true" className="absolute inset-x-0 -bottom-1 h-px bg-current opacity-20" /> : null}
        {line || underline ? (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-1 h-px origin-right scale-x-0 bg-brand transition-transform duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover/stagger:origin-left group-hover/stagger:scale-x-100 group-focus-visible/stagger:origin-left group-focus-visible/stagger:scale-x-100 motion-reduce:transition-none"
          />
        ) : null}
      </span>
      {arrow ? (
        <span aria-hidden="true" className="flex size-4 shrink-0 items-center overflow-hidden">
          <span className="flex h-full w-max -translate-x-1/2 transition-transform duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover/stagger:translate-x-0 group-focus-visible/stagger:translate-x-0 motion-reduce:transition-none">
            <ArrowRightIcon className="flex-none" strokeWidth={1.8} />
            <ArrowRightIcon className="flex-none" strokeWidth={1.8} />
          </span>
        </span>
      ) : null}
    </Comp>
  );
}
