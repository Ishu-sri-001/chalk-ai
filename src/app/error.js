"use client";

import { useEffect } from "react";
import { RotateCcwIcon } from "lucide-react";
import ArrowFillButton from "@/components/ui/ArrowFillButton";

export default function Error({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="chalk-container flex flex-1 items-center justify-center py-[10vh]">
      <div className="flex w-[40vw] flex-col items-center gap-[4vh] text-center max-md:w-[70vw] max-sm:w-full">
        <div className="flex flex-col gap-[1.6vh]">
          <h1 className="text-48">Something smudged the board.</h1>
          <p className="text-21 text-muted-foreground">
            Chalk hit an unexpected error. Your recent lessons are saved in this browser.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <ArrowFillButton onClick={() => retry()}>Try again</ArrowFillButton>
          <ArrowFillButton variant="outline" icon={RotateCcwIcon} onClick={() => window.location.reload()}>
            Start over
          </ArrowFillButton>
        </div>
      </div>
    </main>
  );
}
