"use client";

import { useTutorStore } from "@/store/tutor-store";

export default function SetupNotice() {
  const configured = useTutorStore((s) => s.aiConfigured);
  if (configured) return null;
  return (
    <div
      role="status"
      className="flex w-[80%] items-center gap-3 border-y border-hairline py-[1.6vh] text-19 text-muted-foreground max-md:w-full"
    >
      <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
      <p>
        <span className="text-foreground">No AI provider is connected.</span> Lessons can&apos;t be generated until
        the server has an <code className="font-mono">OPENAI_API_KEY</code> or{" "}
        <code className="font-mono">GEMINI_API_KEY</code> environment variable. See the README.
      </p>
    </div>
  );
}
