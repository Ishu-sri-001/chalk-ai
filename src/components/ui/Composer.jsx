"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import ArrowFillButton from "@/components/ui/ArrowFillButton";
import { cn } from "@/lib/utils";

const MAX_HEIGHT = { lg: 168, sm: 120 };

const SIZES = {
  lg: {
    form: "gap-2 rounded-2xl px-[0.6vw] py-[0.8vh] shadow-(--shadow-card) max-md:px-[1.2vw] max-sm:px-[2vw]",
    icon: "flex h-[6.4vh] items-center px-[0.6vw] max-md:h-[4.8vh] max-md:px-[1vw] max-sm:hidden [&_svg]:size-5",
    input: "px-[0.4vw] py-[1.6vh] text-21 max-md:px-[1vw] max-md:py-[1.2vh] max-sm:px-[2vw] max-sm:py-[1.6vh]",
  },
  sm: {
    form: "gap-1.5 rounded-3xl px-[0.4vw] py-[0.6vh] max-md:px-[1vw] max-sm:px-[1.6vw]",
    icon: "flex h-[4.4vh] items-center px-[0.4vw] max-md:h-[3.4vh] [&_svg]:size-4",
    input: "px-[0.8vw] py-[1vh] text-19 max-md:px-[1.6vw] max-md:py-[0.8vh] max-sm:px-[3vw] max-sm:py-[1vh]",
  },
};

export default function Composer({
  onSubmit,
  placeholder,
  maxLength,
  busy = false,
  disabled = false,
  submitLabel,
  label,
  size = "lg",
  initialValue = "",
  icon: Icon,
  className,
}) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef(null);
  const inputId = useId();
  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && !busy && !disabled;
  const styles = SIZES[size];

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(trimmed);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const resize = (el) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT[size])}px`;
  };

  const nearLimit = maxLength && value.length > maxLength * 0.8;

  return (
    <form
      className={cn(
        "relative flex items-end border border-border bg-card transition-[border-color,background-color] duration-300 ease-out-quint hover:border-foreground/20 focus-within:border-brand/45",
        styles.form,
        disabled && "opacity-70",
        className
      )}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {Icon ? (
        <span aria-hidden="true" className={cn("shrink-0 text-foreground/70", styles.icon)}>
          <Icon strokeWidth={1.5} />
        </span>
      ) : null}
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <textarea
        id={inputId}
        ref={ref}
        rows={1}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          resize(e.target);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className={cn(
          "min-h-0 min-w-0 flex-1 resize-none bg-transparent text-foreground outline-none placeholder:truncate placeholder:text-muted-foreground/75 disabled:cursor-not-allowed",
          styles.input
        )}
      />
      <AnimatePresence>
        {nearLimit ? (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="self-center px-1 text-17 tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {maxLength - value.length}
          </motion.span>
        ) : null}
      </AnimatePresence>
      <ArrowFillButton type="submit" size={size} disabled={!canSubmit} busy={busy} collapseOnMobile={size === "lg"}>
        {submitLabel}
      </ArrowFillButton>
    </form>
  );
}
