"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, SplitText } from "@/lib/motion";

const DEFAULT_TEXT = <p className="text-24">Pull the words from the noise.</p>;

export default function MaskTextReveal({
  children = DEFAULT_TEXT,
  animateOnScroll = true,
  stagger = 0.2,
  duration = 5.5,
  delay = 0,
  className = "",
  scrub = false,
  maskAngle = 150,
  maskSoftness = 33.3,
  textColor,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const elements = Array.from(el.children);
    const splits = [];
    const ctx = gsap.context(() => {}, el);
    let unmounted = false;

    const forceAriaVisible = (root) => {
      root?.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.setAttribute("aria-hidden", "false"));
    };

    const applyMaskStyles = (line) => {
      const softness = Math.min(66.6, Math.max(0, maskSoftness));
      line.style.maskSize = "500% 100%";
      line.style.maskImage = `linear-gradient(${maskAngle}deg, #e8e8e8 ${50 - softness / 2}%, rgba(255, 255, 255, 0) ${50 + softness / 2}%)`;
    };

    const init = () => {
      const lines = [];

      elements.forEach((element) => {
        const split = SplitText.create(element, { type: "lines", linesClass: "Headingline++", lineThreshold: 0.1 });
        splits.push(split);

        const textIndent = getComputedStyle(element).textIndent;
        if (textIndent && textIndent !== "0px" && split.lines.length > 0) {
          split.lines[0].style.paddingLeft = textIndent;
          element.style.textIndent = "0";
        }

        split.lines.forEach(applyMaskStyles);
        forceAriaVisible(element);
        lines.push(...split.lines);
      });

      if (!lines.length) return;

      const scrollTrigger = animateOnScroll
        ? {
            trigger: el,
            start: "top 80%",
            once: !scrub,
            scrub,
            onEnter: () => elements.forEach(forceAriaVisible),
          }
        : undefined;

      if (prefersReducedMotion()) {
        gsap.set(lines, { maskImage: "none", webkitMaskImage: "none" });
        gsap.set(el, { opacity: 0 });
        gsap.to(el, { opacity: 1, duration: 0.8, ease: "power2.out", delay, scrollTrigger: scrollTrigger && { ...scrollTrigger, once: true } });
        return;
      }

      gsap.set(el, { opacity: 1 });
      gsap.set(lines, { maskPosition: "100% 100%" });
      gsap.to(lines, { maskPosition: "0% 100%", stagger, duration, ease: "power3.out", delay, scrollTrigger });
    };

    (async () => {
      try {
        await document.fonts?.ready;
      } catch {}
      if (!unmounted) ctx.add(init);
    })();

    return () => {
      unmounted = true;
      ctx.revert();
      splits.forEach((split) => split.revert());
    };
  }, [animateOnScroll, delay, duration, scrub, stagger, maskAngle, maskSoftness]);

  return (
    <div
      ref={containerRef}
      className={`opacity-0 ${className}`.trim()}
      style={textColor ? { color: textColor } : undefined}
    >
      {children}
    </div>
  );
}
