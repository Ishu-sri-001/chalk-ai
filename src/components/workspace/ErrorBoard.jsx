"use client";

import { PencilLineIcon, RefreshCwIcon } from "lucide-react";
import ArrowFillButton from "@/components/ui/ArrowFillButton";
import BoardFrame from "@/components/workspace/BoardFrame";
import OutOfChalkBoard from "@/components/workspace/OutOfChalkBoard";
import { useTutorStore } from "@/store/tutor-store";

export default function ErrorBoard({ error, topic }) {
  const retry = useTutorStore((s) => s.retry);
  const goHome = useTutorStore((s) => s.goHome);
  const daily = useTutorStore((s) => s.daily);
  if (error?.code === "DAILY_LIMIT") return <OutOfChalkBoard daily={daily} onHome={goHome} />;
  const refused = error?.code === "TOPIC_REFUSED" || error?.code === "INVALID_INPUT";
  const notConfigured = error?.code === "NOT_CONFIGURED";

  return (
    <BoardFrame label="Lesson could not be created">
      <div className="flex flex-col items-center gap-[1.6vh]">
        <p className="font-heading text-48 font-medium text-foreground">
          {refused ? "Let's try a different topic." : "The lesson didn't come through."}
        </p>
        <p className="w-[70%] text-21 text-muted-foreground max-md:w-[90%]">{error?.message}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {!refused && !notConfigured ? (
          <ArrowFillButton icon={RefreshCwIcon} onClick={retry}>
            Try again
          </ArrowFillButton>
        ) : null}
        <ArrowFillButton variant={refused ? "solid" : "outline"} icon={PencilLineIcon} onClick={goHome}>
          Change topic
        </ArrowFillButton>
      </div>
      {!refused ? <p className="text-19 text-muted-foreground">Topic: {topic}</p> : null}
    </BoardFrame>
  );
}
