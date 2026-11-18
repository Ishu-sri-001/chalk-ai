import { BOARD } from "@/lib/lesson/constants";
import { splitRef } from "@/lib/whiteboard/refs";

const W = BOARD.width;
const M = BOARD.margin;

export const FONT_SIZES = {
  heading: { sm: 38, md: 46, lg: 56 },
  text: { sm: 26, md: 32, lg: 40 },
  formula: { sm: 30, md: 38, lg: 48 },
  annotation: { sm: 24, md: 24, lg: 24 },
};
const CHAR_WIDTH = { heading: 0.52, text: 0.5, formula: 0.5, annotation: 0.5 };
export const LINE_HEIGHT = 1.28;

const approxWidth = (s, fontSize, type) => s.length * fontSize * (CHAR_WIDTH[type] ?? 0.5);

export function wrapText(content, fontSize, maxWidth, type = "text") {
  const words = String(content).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && approxWidth(next, fontSize, type) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function defaultMaxWidth(a) {
  const room =
    a.align === "middle"
      ? 2 * Math.min(a.x - M, W - M - a.x)
      : a.align === "end"
        ? a.x - M
        : W - M - a.x;
  const preferred = a.type === "annotation" ? 380 : a.type === "heading" ? W - 2 * M : 640;
  return Math.max(160, Math.min(a.maxWidth ?? preferred, room));
}

export function textLayout(a) {
  const fontSize = FONT_SIZES[a.type]?.[a.size ?? "md"] ?? 32;
  const maxWidth = defaultMaxWidth(a);
  const lines = wrapText(a.content, fontSize, maxWidth, a.type);
  const width = Math.max(...lines.map((l) => approxWidth(l, fontSize, a.type)));
  const lineHeight = fontSize * LINE_HEIGHT;
  const align = a.type === "annotation" ? "start" : (a.align ?? "start");
  const left = align === "middle" ? a.x - width / 2 : align === "end" ? a.x - width : a.x;
  const top = a.y - fontSize * 0.82;
  return {
    lines,
    fontSize,
    lineHeight,
    width,
    align,
    anchor: align === "middle" ? "middle" : align === "end" ? "end" : "start",
    bounds: { x: left, y: top, width, height: lineHeight * (lines.length - 1) + fontSize * 1.05 },
  };
}

export function nodePositions(a) {
  const spacing = a.spacing ?? 100;
  return Array.from({ length: a.count }, (_, i) => {
    const offset = (i - (a.count - 1) / 2) * spacing;
    return a.direction === "horizontal"
      ? { x: a.x + offset, y: a.y }
      : { x: a.x, y: a.y + offset };
  });
}

export function elementBounds(a) {
  switch (a.type) {
    case "heading":
    case "text":
    case "formula":
    case "annotation":
      return textLayout(a).bounds;
    case "circle":
      return { x: a.x - a.r, y: a.y - a.r, width: a.r * 2, height: a.r * 2 };
    case "ellipse":
      return { x: a.x - a.rx, y: a.y - a.ry, width: a.rx * 2, height: a.ry * 2 };
    case "rectangle":
    case "graph":
      return { x: a.x, y: a.y, width: a.width, height: a.height };
    case "drawNodes": {
      const pts = nodePositions(a);
      const r = a.radius ?? 26;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      return {
        x: Math.min(...xs) - r,
        y: Math.min(...ys) - r,
        width: Math.max(...xs) - Math.min(...xs) + r * 2,
        height: Math.max(...ys) - Math.min(...ys) + r * 2,
      };
    }
    case "line":
    case "arrow":
      return {
        x: Math.min(a.from.x, a.to.x),
        y: Math.min(a.from.y, a.to.y),
        width: Math.abs(a.to.x - a.from.x),
        height: Math.abs(a.to.y - a.from.y),
      };
    case "highlight":
      return a.target ? null : { x: a.x, y: a.y, width: a.width, height: a.height };
    default:
      return null;
  }
}

export function resolveAnchors(ref, elementIndex) {
  const { id, index } = splitRef(ref);
  const el = elementIndex.get(id);
  if (!el) return [];
  const a = el.action;
  const hidden = new Set(el.hiddenNodes || []);

  if (a.type === "drawNodes") {
    const r = a.radius ?? 26;
    return nodePositions(a)
      .map((p, i) => ({ ...p, i }))
      .filter((p) => (index === null ? !hidden.has(p.i) : p.i === index && !hidden.has(p.i)))
      .map((p) => ({ x: p.x, y: p.y, shape: "circle", r }));
  }
  if (a.type === "circle") return [{ x: a.x, y: a.y, shape: "circle", r: a.r }];
  if (a.type === "ellipse") return [{ x: a.x, y: a.y, shape: "ellipse", rx: a.rx, ry: a.ry }];
  const b = elementBounds(a);
  if (!b) return [];
  return [
    {
      x: b.x + b.width / 2,
      y: b.y + b.height / 2,
      shape: "rect",
      hw: b.width / 2 + 6,
      hh: b.height / 2 + 6,
    },
  ];
}

export function boundaryPoint(anchor, toward, gap = 6) {
  const dx = toward.x - anchor.x;
  const dy = toward.y - anchor.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  let dist;
  if (anchor.shape === "circle") {
    dist = anchor.r;
  } else if (anchor.shape === "ellipse") {
    dist = 1 / Math.sqrt((ux / anchor.rx) ** 2 + (uy / anchor.ry) ** 2);
  } else if (anchor.shape === "rect") {
    const sx = Math.abs(ux) > 1e-6 ? anchor.hw / Math.abs(ux) : Infinity;
    const sy = Math.abs(uy) > 1e-6 ? anchor.hh / Math.abs(uy) : Infinity;
    dist = Math.min(sx, sy);
  } else {
    dist = 0;
  }
  dist = Math.min(dist + gap, len / 2);
  return { x: anchor.x + ux * dist, y: anchor.y + uy * dist };
}

const MAX_EDGES = 64;

export function connectionEdges(a, elementIndex) {
  const from = resolveAnchors(a.from, elementIndex);
  const to = resolveAnchors(a.to, elementIndex);
  if (!from.length || !to.length) return [];
  const pairs = [];
  if (a.mode === "pairwise") {
    const n = Math.max(from.length, to.length);
    for (let i = 0; i < n; i++) pairs.push([from[i % from.length], to[i % to.length]]);
  } else {
    for (const f of from) for (const t of to) pairs.push([f, t]);
  }
  return pairs.slice(0, MAX_EDGES).map(([f, t]) => ({
    from: boundaryPoint(f, t),
    to: boundaryPoint(t, f),
  }));
}

export function arrowGeometry(from, to, curve = 0, headSize = 16) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bend = curve * len * 0.5;
  const c = { x: (from.x + to.x) / 2 + nx * bend, y: (from.y + to.y) / 2 + ny * bend };

  const d = curve
    ? `M ${from.x} ${from.y} Q ${c.x} ${c.y} ${to.x} ${to.y}`
    : `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  const tx = curve ? to.x - c.x : dx;
  const ty = curve ? to.y - c.y : dy;
  const tl = Math.hypot(tx, ty) || 1;
  const ux = tx / tl;
  const uy = ty / tl;
  const size = Math.min(headSize, len * 0.4);
  const back = { x: to.x - ux * size, y: to.y - uy * size };
  const head = [
    { x: back.x + -uy * size * 0.55, y: back.y + ux * size * 0.55 },
    { x: to.x, y: to.y },
    { x: back.x - -uy * size * 0.55, y: back.y - ux * size * 0.55 },
  ];

  const mid = curve
    ? { x: 0.25 * from.x + 0.5 * c.x + 0.25 * to.x, y: 0.25 * from.y + 0.5 * c.y + 0.25 * to.y }
    : { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const side = Math.abs(dx) >= Math.abs(dy) ? { x: 0, y: -14 } : { x: 14, y: 0 };
  return { d, head, mid, labelAt: { x: mid.x + side.x, y: mid.y + side.y }, vertical: Math.abs(dy) > Math.abs(dx) };
}

export function niceTicks(min, max, target = 5) {
  const span = max - min || 1;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= target) ?? raw;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
    ticks.push(Math.round(v / step) * step);
  }
  return ticks;
}

const PLOT_PAD = { left: 64, right: 18, top: 40, bottom: 56 };

export function graphLayout(a) {
  const plot = {
    x: a.x + PLOT_PAD.left,
    y: a.y + (a.title ? PLOT_PAD.top : 14),
    width: a.width - PLOT_PAD.left - PLOT_PAD.right,
  };
  plot.height = a.y + a.height - PLOT_PAD.bottom - plot.y;

  if (a.kind === "bar") {
    const values = a.bars.map((b) => b.value);
    const yMin = a.yRange?.[0] ?? Math.min(0, ...values);
    const yMax = a.yRange?.[1] ?? (Math.max(0, ...values) * 1.1 || 1);
    const sy = (v) => plot.y + plot.height - ((v - yMin) / (yMax - yMin || 1)) * plot.height;
    const slot = plot.width / a.bars.length;
    return {
      plot,
      yTicks: niceTicks(yMin, yMax, 4),
      sy,
      bars: a.bars.map((b, i) => {
        const top = sy(Math.max(b.value, yMin));
        const base = sy(Math.max(yMin, 0));
        return {
          ...b,
          x: plot.x + slot * i + slot * 0.18,
          width: slot * 0.64,
          y: Math.min(top, base),
          height: Math.abs(base - top),
        };
      }),
    };
  }

  const pts = a.series.flatMap((s) => s.points);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const pad = (lo, hi) => (hi - lo || Math.abs(hi) || 1) * 0.06;
  const xMin = a.xRange?.[0] ?? Math.min(...xs);
  const xMax = a.xRange?.[1] ?? Math.max(...xs);
  const yLo = Math.min(...ys);
  const yHi = Math.max(...ys);
  const yMin = a.yRange?.[0] ?? yLo - pad(yLo, yHi);
  const yMax = a.yRange?.[1] ?? yHi + pad(yLo, yHi);
  const sx = (v) => plot.x + ((v - xMin) / (xMax - xMin || 1)) * plot.width;
  const sy = (v) => plot.y + plot.height - ((v - yMin) / (yMax - yMin || 1)) * plot.height;
  const clip = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return {
    plot,
    sx,
    sy,
    xTicks: niceTicks(xMin, xMax, 5),
    yTicks: niceTicks(yMin, yMax, 4),
    series: a.series.map((s) => ({
      ...s,
      screen: s.points.map(([x, y]) => ({
        x: clip(sx(x), plot.x, plot.x + plot.width),
        y: clip(sy(y), plot.y, plot.y + plot.height),
      })),
    })),
  };
}

export function formatTick(v) {
  const abs = Math.abs(v);
  if (abs >= 10000) return `${Math.round(v / 1000)}k`;
  if (abs >= 100 || Number.isInteger(v)) return String(Math.round(v));
  return String(Number(v.toFixed(2)));
}
