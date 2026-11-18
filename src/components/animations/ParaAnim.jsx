"use client";

import { useRef } from "react";
import {
  gsap,
  onEnterViewport,
  prefersReducedMotion,
  ScrollTrigger,
  SplitText,
  useGSAP,
  whenFontsReady,
} from "@/lib/motion";

const REDUCED_FADE = 0.3;
const NEAR_MARGIN = "200% 0px";

export default function ParaAnim({
  as,
  children,
  className = "",
  delay = 0,
  scrub = false,
  top = "top 85%",
  stagger = 0.08,
  duration = 0.85,
  play,
  ...props
}) {
  const Tag = as ?? "p";
  const ref = useRef(null);

  useGSAP(
    (_, contextSafe) => {
      const el = ref.current;
      if (!el || !contextSafe) return;

      if (prefersReducedMotion()) {
        if (play === false) return;
        const fade = () =>
          gsap.to(el, { opacity: 1, duration: REDUCED_FADE, delay: scrub ? 0 : delay, ease: "none" });
        if (play) {
          fade();
          return;
        }
        return onEnterViewport(el, contextSafe(fade));
      }

      const to = { yPercent: 0, duration, stagger, ease: "power3.out" };

      const init = contextSafe(() => {
        if (!ref.current) return;
        const split = SplitText.create(el, { type: "lines", linesClass: "para-line", mask: "lines", aria: "auto" });
        const lines = split.lines;
        gsap.set(el, { opacity: 1 });
        gsap.set(lines, { yPercent: 150 });
        if (!lines.length || play === false) return;

        if (play) {
          gsap.to(lines, { ...to, delay });
          return;
        }

        if (scrub) {
          gsap.to(lines, { ...to, scrollTrigger: { trigger: el, start: top, end: "bottom 60%", scrub } });
          return;
        }

        const box = el.getBoundingClientRect();
        if (box.top < window.innerHeight && box.bottom > 0) {
          gsap.to(lines, { ...to, delay });
          return;
        }

        ScrollTrigger.create({ trigger: el, start: top, once: true, onEnter: () => gsap.to(lines, { ...to, delay }) });
      });

      let stopWaiting = () => {};
      const box = el.getBoundingClientRect();
      if (play !== undefined || (box.top < window.innerHeight * 1.5 && box.bottom > -window.innerHeight)) {
        stopWaiting = whenFontsReady(init);
        return () => stopWaiting();
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          stopWaiting = whenFontsReady(init);
        },
        { rootMargin: NEAR_MARGIN }
      );
      observer.observe(el);
      return () => {
        observer.disconnect();
        stopWaiting();
      };
    },
    { dependencies: [play], revertOnUpdate: true }
  );

  return (
    <Tag ref={ref} className={`opacity-0 ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
