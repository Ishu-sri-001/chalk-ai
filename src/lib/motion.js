import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

const ENTER_MARGIN = "0px 0px -8% 0px";
const FONT_WAIT_CAP = 300;

export const onEnterViewport = (el, callback) => {
  const rect = el.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    callback();
    return () => {};
  }
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      callback();
    },
    { rootMargin: ENTER_MARGIN }
  );
  observer.observe(el);
  return () => observer.disconnect();
};

export const whenFontsReady = (callback) => {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    callback();
  };
  const timer = window.setTimeout(run, FONT_WAIT_CAP);
  if (document.fonts) document.fonts.ready.then(run, run);
  else run();
  return () => {
    done = true;
    window.clearTimeout(timer);
  };
};

export { gsap, useGSAP, ScrollTrigger, SplitText };

export const EASE_OUT = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT = [0.45, 0, 0.25, 1];
export const EASE_GLIDE = [0.32, 0.72, 0, 1];

export const GLIDE = { type: "spring", duration: 0.42, bounce: 0.12 };

export const POP_IN = { duration: 0.28, ease: EASE_OUT };
export const POP_OUT = { duration: 0.18, ease: EASE_IN_OUT };

export const RISE = { duration: 0.55, ease: EASE_OUT };

export function popVariants(side = "bottom") {
  const offset = side === "top" ? 6 : side === "bottom" ? -6 : 0;
  const offsetX = side === "left" ? 6 : side === "right" ? -6 : 0;
  return {
    closed: { opacity: 0, scale: 0.96, y: offset, x: offsetX, transition: POP_OUT },
    open: {
      opacity: 1,
      scale: 1,
      y: 0,
      x: 0,
      transition: { ...POP_IN, staggerChildren: 0.025, delayChildren: 0.04 },
    },
  };
}

export const rowVariants = {
  closed: { opacity: 0, y: 4 },
  open: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
};
