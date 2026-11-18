"use client";

import { MaximizeIcon, MinimizeIcon, RotateCcwIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import PlayButton from "@/components/playback/PlayButton";
import { usePlayerContext, usePlayerState } from "@/components/playback/PlayerProvider";
import SeekBar from "@/components/playback/SeekBar";
import VoicePicker from "@/components/playback/VoicePicker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";
import { useDeviceNarrates } from "@/hooks/use-device-narrates";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { formatTime } from "@/lib/playback/timeline";
import { cn } from "@/lib/utils";

export default function PlaybackBar({ fullscreenTarget }) {
  const { player, track } = usePlayerContext();
  const status = usePlayerState((s) => s.status, "idle");
  const segmentIndex = usePlayerState((s) => s.segmentIndex, 0);
  const time = usePlayerState((s) => Math.floor(s.time), 0);
  const total = usePlayerState((s) => Math.round(s.total), 0);
  const fullscreen = useFullscreen(fullscreenTarget);
  const count = track.segments.length;

  const playing = status === "playing" || status === "buffering";
  const ended = status === "ended";

  return (
    <div className="flex h-[6.4vh] items-center gap-1.5 border-t border-board-edge bg-board px-[0.8vw] max-md:h-[4.8vh] max-md:px-[1.6vw] max-sm:h-[6.8vh] max-sm:gap-1 max-sm:px-[2.4vw]">
      <PlayButton state={playing ? "pause" : ended ? "replay" : "play"} disabled={!player} onClick={() => player.toggle()} />

      <div className="flex items-center max-sm:hidden">
        <Control label="Start over" onClick={() => player.restart()} disabled={!player}>
          <RotateCcwIcon />
        </Control>
        {count > 1 ? (
          <>
            <Control label="Previous part (Shift+←)" onClick={() => player.skip(-1)} disabled={!player}>
              <SkipBackIcon />
            </Control>
            <Control label="Next part (Shift+→)" onClick={() => player.skip(1)} disabled={!player || segmentIndex >= count - 1}>
              <SkipForwardIcon />
            </Control>
          </>
        ) : null}
      </div>

      <span className="shrink-0 px-1.5 font-mono text-17 tabular-nums text-muted-foreground" aria-hidden="true">
        <span className="text-foreground">{formatTime(time)}</span>
        <span className="px-1 text-foreground/25">/</span>
        {formatTime(total)}
      </span>

      <SeekBar />

      {count > 1 ? (
        <span className="sr-only" aria-live="polite">
          Part {segmentIndex + 1} of {count}
        </span>
      ) : null}

      <VoiceControl />

      {fullscreen.supported ? (
        <Control label={fullscreen.active ? "Exit full screen" : "Full screen"} onClick={fullscreen.toggle}>
          {fullscreen.active ? <MinimizeIcon /> : <MaximizeIcon />}
        </Control>
      ) : null}
    </div>
  );
}

function Control({ label, children, className, ...props }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex aspect-square h-[4vh] shrink-0 items-center justify-center rounded-full text-foreground/65 outline-none transition-[background-color,color,transform] duration-200 hover:bg-foreground/5 hover:text-foreground active:scale-90 focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-30 max-md:h-[3vh] max-sm:h-[4.4vh] [&_svg]:size-[45%]",
            className
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function VoiceControl() {
  const { voice, deviceNarrates } = useDeviceNarrates();
  if (!deviceNarrates) return null;
  const note =
    voice === "quota"
      ? "The AI voice quota ran out, so your device's voices read the lesson. Pick one:"
      : voice === "partial"
        ? "Some parts are read by your device's voices. Pick one:"
        : undefined;
  return <VoicePicker note={note} />;
}
