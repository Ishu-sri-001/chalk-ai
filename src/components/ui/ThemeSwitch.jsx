"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";
import { gsap } from "@/lib/motion";
import { applyTheme, getTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const REVEAL_SECONDS = 0.75;

export default function ThemeSwitch({ className }) {
  const theme = useTheme();
  const busy = React.useRef(false);
  const sun = React.useRef(null);
  const moon = React.useRef(null);
  const previous = React.useRef(theme);

  React.useLayoutEffect(() => {
    const before = previous.current;
    previous.current = theme;
    if (!before || before === theme || !sun.current || !moon.current) return;
    const toDark = theme === "dark";
    const leaving = toDark ? sun.current : moon.current;
    const entering = toDark ? moon.current : sun.current;
    gsap.killTweensOf([leaving, entering]);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(leaving, { scale: 0, opacity: 0 });
      gsap.set(entering, { scale: 1, rotate: 0, opacity: 1 });
      return;
    }
    gsap
      .timeline()
      .fromTo(leaving, { rotate: 0, scale: 1, opacity: 1 }, { rotate: 120, scale: 0, opacity: 0, duration: 0.2, ease: "power2.in" })
      .fromTo(entering, { rotate: -120, scale: 0, opacity: 0 }, { rotate: 0, scale: 1, opacity: 1, duration: 0.38, ease: "back.out(1.7)" });
  }, [theme]);

  const toggle = async (event) => {
    if (busy.current) return;
    const next = getTheme() === "dark" ? "light" : "dark";
    const apply = () => applyTheme(next);
    const root = document.documentElement;

    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply();
      return;
    }

    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    busy.current = true;
    root.classList.add("theme-sweeping");
    const view = document.startViewTransition(apply);

    try {
      await view.ready;
      const reveal = root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 1000, easing: "linear", fill: "both", pseudoElement: "::view-transition-new(root)" }
      );
      reveal.pause();
      const progress = { t: 0 };
      await gsap.to(progress, {
        t: 1000,
        duration: REVEAL_SECONDS,
        ease: "power2.inOut",
        onUpdate: () => {
          reveal.currentTime = progress.t;
        },
      });
      reveal.finish();
      await view.finished;
    } catch {
      view.skipTransition();
      await view.finished.catch(() => {});
    } finally {
      root.classList.remove("theme-sweeping");
      busy.current = false;
    }
  };

  const label = theme === "dark" ? "Switch to light" : "Switch to dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-label={label}
          className={cn(
            "relative inline-flex aspect-square h-[4.4vh] items-center justify-center overflow-hidden rounded-full text-foreground/75 outline-none max-md:h-[3.4vh] max-sm:h-[4.8vh] [&_svg]:size-[45%]",
            "transition-[background-color,color,transform] duration-200 hover:bg-foreground/5 hover:text-foreground active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/35",
            className
          )}
        >
          <SunIcon ref={sun} className="theme-sun absolute" strokeWidth={1.6} />
          <MoonIcon ref={moon} className="theme-moon absolute" strokeWidth={1.6} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
