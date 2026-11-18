"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BOARD } from "@/lib/lesson/constants";

const MIN = 1;
const MAX = 4;
const STEP = 1.35;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function rectFor({ scale, cx, cy }) {
  const w = BOARD.width / scale;
  const h = BOARD.height / scale;
  return {
    x: clamp(cx - w / 2, 0, BOARD.width - w),
    y: clamp(cy - h / 2, 0, BOARD.height - h),
    w,
    h,
  };
}

const FIT = { scale: 1, cx: BOARD.width / 2, cy: BOARD.height / 2 };

export function toBoardPoint(svg, clientX, clientY) {
  const ctm = svg?.getScreenCTM();
  if (!ctm) return null;
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

export function useBoardViewport({ svgRef, containerRef, penActive }) {
  const [view, setView] = useState(FIT);
  const rect = rectFor(view);
  const pointers = useRef(new Map());
  const gesture = useRef(null);

  const zoomAt = useCallback((factor, point) => {
    setView((v) => {
      const scale = clamp(v.scale * factor, MIN, MAX);
      if (scale === MIN) return FIT;
      const r = rectFor(v);
      const p = point ?? { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      const fx = (p.x - r.x) / r.w;
      const fy = (p.y - r.y) / r.h;
      const w = BOARD.width / scale;
      const h = BOARD.height / scale;
      const x = p.x - fx * w;
      const y = p.y - fy * h;
      return { scale, cx: x + w / 2, cy: y + h / 2 };
    });
  }, []);

  const zoomIn = useCallback(() => zoomAt(STEP), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt(1 / STEP), [zoomAt]);
  const fit = useCallback(() => setView(FIT), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.01), toBoardPoint(svgRef.current, e.clientX, e.clientY));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [containerRef, svgRef, zoomAt]);

  const onPointerDown = useCallback(
    (e) => {
      if (penActive) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        gesture.current = { kind: "pinch", dist: Math.hypot(a.x - b.x, a.y - b.y) };
      } else if (view.scale > 1) {
        e.currentTarget.setPointerCapture(e.pointerId);
        gesture.current = { kind: "pan", x: e.clientX, y: e.clientY };
      }
    },
    [penActive, view.scale]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gesture.current;
      if (!g) return;
      if (g.kind === "pinch" && pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = toBoardPoint(svgRef.current, (a.x + b.x) / 2, (a.y + b.y) / 2);
        if (g.dist > 0) zoomAt(dist / g.dist, mid);
        g.dist = dist;
      } else if (g.kind === "pan") {
        const box = svgRef.current.getBoundingClientRect();
        const unit = Math.max(rect.w / box.width, rect.h / box.height);
        const dx = (e.clientX - g.x) * unit;
        const dy = (e.clientY - g.y) * unit;
        g.x = e.clientX;
        g.y = e.clientY;
        setView((v) => {
          const r = rectFor(v);
          return { ...v, cx: r.x + r.w / 2 - dx, cy: r.y + r.h / 2 - dy };
        });
      }
    },
    [rect.w, rect.h, svgRef, zoomAt]
  );

  const onPointerUp = useCallback((e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2 && gesture.current?.kind === "pinch") gesture.current = null;
    if (pointers.current.size === 0) gesture.current = null;
  }, []);

  return {
    viewBox: `${rect.x} ${rect.y} ${rect.w} ${rect.h}`,
    scale: view.scale,
    zoomIn,
    zoomOut,
    fit,
    canZoomIn: view.scale < MAX,
    canZoomOut: view.scale > MIN,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
