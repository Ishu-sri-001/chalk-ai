import FadeUp from "@/components/animations/FadeUp";
import MaskTextReveal from "@/components/animations/MaskTextReveal";

export default function SectionHeading({ id, children, action, actionDelay = 0.4 }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <MaskTextReveal>
        <h2 id={id} className="text-foreground">
          {children}
        </h2>
      </MaskTextReveal>
      {action ? <FadeUp delay={actionDelay}>{action}</FadeUp> : null}
    </div>
  );
}
