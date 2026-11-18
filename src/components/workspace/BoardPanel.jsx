"use client";

import ErrorBoard from "@/components/workspace/ErrorBoard";
import GeneratingBoard from "@/components/workspace/GeneratingBoard";
import LessonStage from "@/components/workspace/LessonStage";
import { useTutorStore } from "@/store/tutor-store";

export default function BoardPanel() {
  const status = useTutorStore((s) => s.status);
  const topic = useTutorStore((s) => s.topic);
  const error = useTutorStore((s) => s.error);
  const lesson = useTutorStore((s) => s.lesson);

  return (
    <section aria-label="Whiteboard" className="flex min-w-0 flex-col">
      {status === "generating" ? <GeneratingBoard topic={topic} /> : null}
      {status === "error" ? <ErrorBoard error={error} topic={topic} /> : null}
      {status === "ready" && lesson ? <LessonStage lesson={lesson} /> : null}
    </section>
  );
}
