"use client";

import { motion } from "motion/react";
import LessonOutline from "@/components/workspace/LessonOutline";
import { EASE_OUT } from "@/lib/motion";

export default function LessonOverview({ lesson }) {
  return (
    <div className="flex flex-col gap-8 py-[1vh]">
      <section className="flex flex-col gap-3">
        <h3 className="text-21 text-foreground">What you&apos;ll learn</h3>
        {lesson.introduction ? <p className="text-19 text-muted-foreground">{lesson.introduction}</p> : null}
        <ul className="flex flex-col gap-2.5">
          {lesson.objectives.map((o, i) => (
            <motion.li
              key={o}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.15 + i * 0.06, duration: 0.5, ease: EASE_OUT } }}
              className="flex gap-3 text-19 text-foreground/90"
            >
              <span className="flex h-[1lh] shrink-0 items-center" aria-hidden="true">
                <span className="h-px w-3 bg-brand" />
              </span>
              <span>{o}</span>
            </motion.li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-21 text-foreground">Chapters</h3>
        <LessonOutline lesson={lesson} />
      </section>
    </div>
  );
}
