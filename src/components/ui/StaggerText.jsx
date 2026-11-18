import { Fragment } from "react";

const DEFAULT_STEP = 0.012;

export default function StaggerText({ text, step = DEFAULT_STEP, className }) {
  if (typeof text !== "string") return text ?? null;
  let index = 0;
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <Fragment key={w}>
            {w > 0 ? " " : null}
            <span className="stagger-word">
              {[...word].map((char) => {
                const i = index++;
                return (
                  <span key={i} className="stagger-char" style={{ transitionDelay: `${i * step}s` }}>
                    {char}
                  </span>
                );
              })}
            </span>
          </Fragment>
        ))}
      </span>
    </span>
  );
}
