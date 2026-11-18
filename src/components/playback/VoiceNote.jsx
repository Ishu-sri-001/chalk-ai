"use client";

import { AnimatePresence, motion } from "motion/react";
import { VolumeXIcon } from "lucide-react";
import { usePlayerState } from "@/components/playback/PlayerProvider";
import { useDeviceNarrates } from "@/hooks/use-device-narrates";
import { cn } from "@/lib/utils";

export default function VoiceNote({ className }) {
  const { voice, deviceNarrates } = useDeviceNarrates();
  const voiced = usePlayerState((s) => s.voicedCount, 0);
  const ready = usePlayerState((s) => s.readyCount, 0);
  const total = usePlayerState((s) => s.segmentCount, 0);
  if (deviceNarrates) return null;

  let text = null;
  if (voice === "unavailable") text = "Voice is off on this server, so captions only";
  else if (voice === "quota") text = "Voice quota reached, so captions only";
  else if (voice === "partial") text = "Some parts couldn't be voiced, so they play as captions";
  else if (ready < total) text = `Preparing voice · ${voiced} of ${total} parts ready`;

  const degraded = voice === "unavailable" || voice === "quota" || voice === "partial";
  return (
    <AnimatePresence initial={false}>
      {text ? (
        <motion.span
          key="voice-note"
          role="status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn("flex shrink-0 items-center gap-1.5 text-17 text-muted-foreground", className)}
        >
          {degraded ? (
            <VolumeXIcon className="size-4" />
          ) : (
            <span className="size-1 animate-pulse rounded-full bg-brand" aria-hidden="true" />
          )}
          {text}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
