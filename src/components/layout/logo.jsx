import { cn } from "@/lib/utils";

export default function Logo({ className, showName = true }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 28 28" className="aspect-square h-[4vh] shrink-0 max-md:h-[3vh] max-sm:h-[4vh]" aria-hidden="true">
        <rect x="1" y="1" width="26" height="26" rx="8" fill="var(--brand)" />
        <path d="M18.6 9.4a6.3 6.3 0 1 0 0 9.2" fill="none" stroke="var(--brand-foreground)" strokeWidth="2.6" strokeLinecap="round" />
        <path
          d="M15.2 12.2a2.4 2.4 0 1 0 0 3.6"
          fill="none"
          stroke="var(--brand-foreground)"
          strokeOpacity="0.55"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {showName ? <span className="font-heading text-30 font-medium text-foreground">ChalkAI</span> : null}
    </span>
  );
}
