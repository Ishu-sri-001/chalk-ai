"use client";

import { useEffect, useState } from "react";
import { AudioLinesIcon } from "lucide-react";
import { usePlayerContext } from "@/components/playback/PlayerProvider";
import CharStaggerButton from "@/components/ui/CharStaggerButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { currentVoice, listVoices, previewVoice, setPreferredVoiceId } from "@/lib/playback/device-voice";

const GROUPS = [
  { key: "female", label: "Female voices" },
  { key: "male", label: "Male voices" },
  { key: null, label: "Other voices" },
];

export default function VoicePicker({ note }) {
  const { player } = usePlayerContext();
  const [voices, setVoices] = useState(() => listVoices());
  const [selected, setSelected] = useState(() => currentVoice()?.id ?? null);

  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth?.addEventListener) return;
    const refresh = () => {
      setVoices(listVoices());
      setSelected(currentVoice()?.id ?? null);
    };
    synth.addEventListener("voiceschanged", refresh);
    return () => synth.removeEventListener("voiceschanged", refresh);
  }, []);

  if (!voices.length) return null;
  const active = voices.find((v) => v.id === selected) || voices[0];

  const choose = (id) => {
    const voice = voices.find((v) => v.id === id);
    if (!voice) return;
    setPreferredVoiceId(id);
    setSelected(id);
    if (player?.getSnapshot().status === "playing") {
      player.refreshVoice();
    } else {
      previewVoice(id, `Hi, I'm ${voice.name}. I'll be your tutor for this lesson.`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CharStaggerButton
          tone="muted"
          size="xs"
          icon={AudioLinesIcon}
          line
          textClassName="w-[9vw] truncate text-left max-md:hidden"
          aria-label={`Narrator voice: ${active.name}. Change voice`}
        >
          {active.name}
        </CharStaggerButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        stagger={false}
        className="max-h-[50vh] w-[22vw] max-md:w-[50vw] max-sm:w-[86vw]"
      >
        <DropdownMenuLabel>{note || "Narrated by your device's built-in voices. Pick one to hear it."}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={active.id} onValueChange={choose}>
          {GROUPS.map(({ key, label }) => {
            const group = voices.filter((v) => v.gender === key);
            if (!group.length) return null;
            return (
              <div key={label} className="flex flex-col gap-0.5">
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="font-medium text-foreground">{label}</DropdownMenuLabel>
                {group.map((v) => (
                  <DropdownMenuRadioItem key={v.id} value={v.id} onSelect={(e) => e.preventDefault()}>
                    <span className="flex-1">{v.name}</span>
                    <span className="text-17 text-muted-foreground">{v.accent}</span>
                  </DropdownMenuRadioItem>
                ))}
              </div>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
