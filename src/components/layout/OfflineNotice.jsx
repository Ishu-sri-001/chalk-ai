"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WifiOffIcon } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";

const subscribe = (cb) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export default function OfflineNotice() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  return (
    <AnimatePresence initial={false}>
      {online ? null : (
        <motion.div
          key="offline"
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } }}
          exit={{ height: 0, opacity: 0, transition: { duration: 0.25 } }}
          className="overflow-hidden border-t border-hairline"
        >
          <p className="chalk-container flex items-center gap-2 py-[1vh] text-17 text-muted-foreground">
            <WifiOffIcon className="size-4 shrink-0 text-brand" aria-hidden="true" />
            You&apos;re offline. Anything already loaded keeps playing; new lessons, questions and voice need a
            connection.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
