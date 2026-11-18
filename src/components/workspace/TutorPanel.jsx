"use client";

import { BookOpenIcon, MessageCircleIcon } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsPanels, TabsTrigger } from "@/components/ui/Tabs";
import FollowUpChat from "@/components/workspace/FollowUpChat";
import LessonOverview from "@/components/workspace/LessonOverview";
import TutorStatus from "@/components/workspace/TutorStatus";
import { useTutorStore } from "@/store/tutor-store";

export default function TutorPanel() {
  const lessonStatus = useTutorStore((s) => s.status);
  const lesson = useTutorStore((s) => s.lesson);
  const tab = useTutorStore((s) => s.panelTab);
  const setTab = useTutorStore((s) => s.setPanelTab);
  const ready = lessonStatus === "ready" && lesson;

  return (
    <aside aria-label="Tutor" className="relative flex min-h-[50vh] flex-col max-md:h-[80vh] max-md:min-h-0">
      <div className="absolute inset-0 flex min-h-0 flex-col max-md:static max-md:flex-1">
        <div className="sticky top-[12vh] flex h-[min(100%,84vh)] min-h-0 flex-col gap-5 border-l border-hairline px-[2vw] max-md:static max-md:h-full max-md:border-l-0 max-md:px-0">
          <TutorStatus />
          <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-5">
            <TabsList label="Lesson panel">
              <TabsTrigger value="lesson">
                <BookOpenIcon strokeWidth={1.7} />
                Lesson
              </TabsTrigger>
              <TabsTrigger value="ask">
                <MessageCircleIcon strokeWidth={1.7} />
                Ask a question
              </TabsTrigger>
            </TabsList>
            <TabsPanels>
              <TabsContent value="lesson" className="scrollbar-quiet overflow-y-auto overscroll-contain">
                {lessonStatus === "generating" ? <PanelSkeleton /> : null}
                {ready ? <LessonOverview lesson={lesson} /> : null}
                {lessonStatus === "error" ? <Waiting /> : null}
              </TabsContent>
              <TabsContent value="ask" className="flex flex-col">
                {ready ? <FollowUpChat lesson={lesson} /> : <Waiting />}
              </TabsContent>
            </TabsPanels>
          </Tabs>
        </div>
      </div>
    </aside>
  );
}

function Waiting() {
  return <p className="text-19 text-muted-foreground">Once a lesson is ready, its chapters and your questions will appear here.</p>;
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3.5 w-4/6" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-1/4" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${88 - i * 8}%` }} />
        ))}
      </div>
    </div>
  );
}
