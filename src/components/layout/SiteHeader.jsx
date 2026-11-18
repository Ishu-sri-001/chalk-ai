"use client";

import { AnimatePresence, motion } from "motion/react";
import { PlusIcon } from "lucide-react";
import ChalkMeter from "@/components/chalk/ChalkMeter";
import HistoryMenu from "@/components/layout/HistoryMenu";
import Logo from "@/components/layout/Logo";
import OfflineNotice from "@/components/layout/OfflineNotice";
import ArrowFillButton from "@/components/ui/ArrowFillButton";
import ThemeSwitch from "@/components/ui/ThemeSwitch";
import { EASE_OUT } from "@/lib/motion";
import { useTutorStore } from "@/store/tutor-store";

export default function SiteHeader() {
  const view = useTutorStore((s) => s.view);
  const goHome = useTutorStore((s) => s.goHome);

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-hairline bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="chalk-container flex items-center justify-between gap-4 py-[2vh] max-md:py-[1.4vh] max-sm:py-[1.6vh]">
        <button
          type="button"
          onClick={goHome}
          className="rounded-lg px-1 py-1 outline-none transition-opacity hover:opacity-75 focus-visible:ring-3 focus-visible:ring-ring/35"
          aria-label="ChalkAI home"
        >
          <Logo />
        </button>

        <nav aria-label="Lesson tools" className="flex items-center gap-6 max-md:gap-4">
          <AnimatePresence initial={false}>
            {view === "workspace" ? (
              <motion.div
                key="new"
                className="max-sm:hidden"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE_OUT } }}
                exit={{ opacity: 0, x: 8, transition: { duration: 0.18 } }}
              >
                <ArrowFillButton variant="outline" size="sm" icon={PlusIcon} onClick={goHome}>
                  New lesson
                </ArrowFillButton>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <ChalkMeter />
          <HistoryMenu />
          <span className="h-[2.4vh] w-px bg-border max-md:h-[1.8vh] max-sm:h-[2.4vh]" aria-hidden="true" />
          <ThemeSwitch />
        </nav>
      </div>
      <OfflineNotice />
    </header>
  );
}
