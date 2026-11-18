"use client";

import { SparklesIcon } from "lucide-react";
import FadeUp from "@/components/animations/FadeUp";
import LineDraw from "@/components/animations/LineDraw";
import MaskTextReveal from "@/components/animations/MaskTextReveal";
import ParaAnim from "@/components/animations/ParaAnim";
import ChalkLine from "@/components/chalk/ChalkLine";
import RecentLessons from "@/components/home/RecentLessons";
import SetupNotice from "@/components/home/SetupNotice";
import Suggestions from "@/components/home/Suggestions";
import Composer from "@/components/ui/Composer";
import { arrivesPhrase } from "@/lib/chalk";
import { LIMITS } from "@/lib/lesson/constants";
import { useTutorStore } from "@/store/tutor-store";

export default function HomeScreen() {
  const startLesson = useTutorStore((s) => s.startLesson);
  const daily = useTutorStore((s) => s.daily);
  const outOfChalk = Boolean(daily && daily.remaining <= 0);

  return (
    <main className="chalk-container grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto_26vw] grid-rows-[minmax(0,1fr)] gap-x-16 max-md:grid-cols-1 max-md:grid-rows-none">
      <div className="flex min-w-0 flex-col gap-[6vh] py-[6vh] max-md:gap-[4vh] max-md:py-[5vh] max-sm:py-[4vh]">
        <div className="flex flex-col gap-[4.4vh] max-md:gap-[3vh]">
          <SetupNotice />

          <div className="flex flex-col gap-[2.4vh] max-md:gap-[1.6vh]">
            <MaskTextReveal animateOnScroll={false} delay={0.1}>
              <h1 className="text-balance text-foreground">
                Learn any topic with an <span className="text-brand">AI&nbsp;tutor</span>
              </h1>
            </MaskTextReveal>

            <ParaAnim delay={0.35} className="w-[80%] text-24 text-pretty text-muted-foreground max-md:w-full">
              Get a two-minute, visual explanation with synchronized voice and an interactive whiteboard
              demonstration.
            </ParaAnim>
          </div>

          <FadeUp delay={0.5} className="flex flex-col gap-[1.6vh]">
            <Composer
              label="Topic"
              icon={SparklesIcon}
              placeholder={
                outOfChalk
                  ? `Out of chalk for today. New chalk arrives ${arrivesPhrase(daily.resetsAt)}`
                  : "Enter a topic to learn..."
              }
              submitLabel="Teach me"
              maxLength={LIMITS.topicMaxChars}
              disabled={outOfChalk}
              onSubmit={startLesson}
            />
            <ChalkLine />
          </FadeUp>
        </div>

        <Suggestions disabled={outOfChalk} onPick={startLesson} />
      </div>

      <div className="flex py-[6vh] max-md:hidden">
        <LineDraw axis="y" start="top 90%" delay={0.3} className="w-px self-stretch bg-border" />
      </div>

      <RecentLessons className="flex min-h-0 min-w-0 flex-col gap-[1.2vh] py-[6vh] max-md:py-[4vh]" />
    </main>
  );
}
