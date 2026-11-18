"use client";

import { useRef } from "react";
import { gsap, onEnterViewport, prefersReducedMotion, useGSAP } from "@/lib/motion";

const FADE_RISE = 24;

export default function FadeUp({ as, children, className = "", delay = 0, ...props }) {
  const Tag = as ?? "div";
  const ref = useRef(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1 });
      return;
    }

    gsap.set(el, { y: FADE_RISE });
    return onEnterViewport(el, () => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        delay,
        ease: "power3.out",
        clearProps: "transform",
        onComplete: () => {
          el.style.removeProperty("opacity");
          el.classList.remove("opacity-0");
        },
      });
    });
  }, []);

  return (
    <Tag ref={ref} className={`opacity-0 ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
