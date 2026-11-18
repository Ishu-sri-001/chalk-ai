"use client";

import { useMemo } from "react";
import BoardElement from "@/components/whiteboard/BoardElement";
import ElementBoundary from "@/components/whiteboard/ElementBoundary";
import { BOARD } from "@/lib/lesson/constants";
import { cn } from "@/lib/utils";
import { buildElementIndex } from "@/lib/whiteboard/board-state";

const FULL_VIEW = `0 0 ${BOARD.width} ${BOARD.height}`;

export default function Whiteboard({
  elements,
  progressFor,
  label,
  className,
  children,
  viewBox = FULL_VIEW,
  svgRef,
  containerRef,
  svgOverlay,
  svgProps,
}) {
  const elementIndex = useMemo(() => buildElementIndex(elements), [elements]);
  const description = useMemo(
    () =>
      elements
        .map((el) => el.action.content || el.action.label || el.action.title)
        .filter(Boolean)
        .join(". "),
    [elements]
  );

  return (
    <div
      ref={containerRef}
      className={cn("board-surface relative isolate w-full overflow-hidden", className)}
      style={{ aspectRatio: `${BOARD.width} / ${BOARD.height}` }}
    >
      <svg
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 size-full select-none"
        role="img"
        aria-label={label || "Whiteboard"}
        {...svgProps}
      >
        {description ? <desc>{description}</desc> : null}
        <g>
          {elements.map((el) => (
            <ElementBoundary key={el.key} type={el.action.type}>
              <BoardElement element={el} progress={progressFor ? progressFor(el) : 1} elementIndex={elementIndex} />
            </ElementBoundary>
          ))}
        </g>
        {svgOverlay}
      </svg>
      {children}
    </div>
  );
}
