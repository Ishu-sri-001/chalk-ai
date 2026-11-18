import { cn } from "@/lib/utils";

export default function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn("skeleton-sweep rounded-md bg-foreground/6", className)} {...props} />;
}
