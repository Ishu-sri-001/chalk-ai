"use client";

import { useSyncExternalStore } from "react";

const subscribeFullscreen = (cb) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};

export function useFullscreen(targetRef) {
  const active = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(targetRef?.current) && document.fullscreenElement === targetRef.current,
    () => false
  );
  const supported = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(document.fullscreenEnabled),
    () => false
  );

  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else targetRef?.current?.requestFullscreen?.().catch(() => {});
  };
  return { active, supported, toggle };
}
