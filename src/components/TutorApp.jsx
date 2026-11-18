"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import HomeScreen from "@/components/home/HomeScreen";
import SiteHeader from "@/components/layout/SiteHeader";
import PlayerProvider from "@/components/playback/PlayerProvider";
import BoardPanel from "@/components/workspace/BoardPanel";
import TutorPanel from "@/components/workspace/TutorPanel";
import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useTutorStore } from "@/store/tutor-store";

export default function TutorApp() {
  const view = useTutorStore((s) => s.view);
  const resetsAt = useTutorStore((s) => s.daily?.resetsAt);

  useEffect(() => {
    useTutorStore.persist.rehydrate();
    useTutorStore.getState().loadStatus();
  }, []);

  useEffect(() => {
    if (!resetsAt) return;
    const wait = new Date(resetsAt).getTime() - Date.now() + 5_000;
    if (wait <= 0 || wait > 2 ** 31 - 1) return;
    const timer = setTimeout(() => useTutorStore.getState().loadStatus(), wait);
    return () => clearTimeout(timer);
  }, [resetsAt]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  return (
    <div className={cn("flex flex-col", view === "home" ? "h-svh max-md:h-auto max-md:min-h-svh" : "min-h-svh")}>
      <SiteHeader />
      <AnimatePresence mode="wait" initial={false}>
        {view === "home" ? (
          <motion.div
            key="home"
            className="flex min-h-0 flex-1 flex-col"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.22, ease: "easeIn" } }}
          >
            <HomeScreen />
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            className="flex flex-1 flex-col"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeIn" } }}
          >
            <Workspace />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Workspace() {
  const status = useTutorStore((s) => s.status);
  const lesson = useTutorStore((s) => s.lesson);
  const lessonId = useTutorStore((s) => s.lessonId);

  const content = (
    <main className="chalk-container flex flex-1 flex-col gap-[3vh] py-[3vh] max-md:gap-[2.4vh] max-md:py-[2.4vh]">
      <WorkspaceHeader />
      <div className="grid grid-cols-[minmax(0,1fr)_26vw] items-stretch gap-8 max-md:grid-cols-1 max-md:gap-6">
        <BoardPanel />
        <TutorPanel />
      </div>
    </main>
  );

  return status === "ready" && lesson ? (
    <PlayerProvider key={lessonId} lesson={lesson} lessonId={lessonId}>
      {content}
    </PlayerProvider>
  ) : (
    content
  );
}
