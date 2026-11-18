"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";

const LINE_START = "top 65%";

export default function LineDraw({ className = "", start = LINE_START, axis = "x", delay = 0, ...props }) {
  const ref = useRef(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const scrollTrigger = { trigger: el.parentElement ?? el, start };

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 0 });
      gsap.to(el, { opacity: 1, duration: 0.8, ease: "power2.out", scrollTrigger });
      return;
    }

    const scale = axis === "y" ? "scaleY" : "scaleX";
    gsap.set(el, { [scale]: 0, transformOrigin: axis === "y" ? "top" : "left" });
    gsap.to(el, { [scale]: 1, duration: 0.8, delay, ease: "power2.out", scrollTrigger });
  }, []);

  return <div ref={ref} aria-hidden="true" className={className} {...props} />;
}
