"use client";

import { usePlayerState } from "@/components/playback/PlayerProvider";

export function useDeviceNarrates() {
  const voice = usePlayerState((s) => s.voice, "loading");
  const device = usePlayerState((s) => s.deviceVoice, false);
  return { voice, deviceNarrates: device && (voice === "unavailable" || voice === "quota" || voice === "partial") };
}
