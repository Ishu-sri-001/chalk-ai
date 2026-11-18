import { chalkTone } from "@/lib/chalk";
import { cn } from "@/lib/utils";

export default function ChalkSticks({ daily, className }) {
  const shown = Math.min(daily.limit, 30);
  const left = Math.round((daily.remaining / daily.limit) * shown);
  const low = chalkTone(daily.remaining) === "low";
  return (
    <span className={cn("flex flex-wrap items-end gap-0.5", className)} aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          style={{ transitionDelay: `${i * 18}ms` }}
          className={cn(
            "w-0.5 rounded-full transition-[height,background-color] duration-500 ease-out-quint",
            i < left ? cn("h-3", low ? "bg-brand" : "bg-foreground/70") : "h-1 bg-foreground/15"
          )}
        />
      ))}
    </span>
  );
}
