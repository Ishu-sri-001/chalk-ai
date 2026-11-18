"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "chalk-theme";

function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export const getTheme = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

export function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => null);
}
