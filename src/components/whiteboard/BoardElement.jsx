"use client";

import { memo } from "react";
import {
  arrowGeometry,
  boundaryPoint,
  connectionEdges,
  elementBounds,
  formatTick,
  graphLayout,
  nodePositions,
  resolveAnchors,
  textLayout,
  wrapText,
} from "@/lib/whiteboard/geometry";

const STROKE = 3.4;
const ink = (color) => (color && color !== "ink" ? `var(--ink-${color})` : "var(--ink)");
const tint = (color, pct = 12) => `color-mix(in oklab, ${ink(color)} ${pct}%, transparent)`;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const phase = (p, start, end) => clamp01((p - start) / (end - start));

function drawProps(progress) {
  if (progress >= 1) return {};
  return { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - clamp01(progress) };
}

function Label({ x, y, children, size = 26, color, anchor = "middle", weight = 400, halo = true }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontFamily="var(--font-board)"
      fontSize={size}
      fontWeight={weight}
      fill={ink(color)}
      stroke={halo ? "var(--board)" : undefined}
      strokeWidth={halo ? 7 : undefined}
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {children}
    </text>
  );
}

function ShapeLabel({ x, y, text, width, color, size = 26 }) {
  const lines = wrapText(text, size, Math.max(80, width - 16)).slice(0, 3);
  const lh = size * 1.15;
  const top = y - ((lines.length - 1) * lh) / 2;
  return lines.map((line, i) => (
    <Label key={i} x={x} y={top + i * lh} size={size} color={color} halo={false}>
      {line}
    </Label>
  ));
}

function TextElement({ action, progress }) {
  const layout = textLayout(action);
  const isHeading = action.type === "heading";
  const isFormula = action.type === "formula";
  const color = action.color ?? (action.type === "annotation" ? "muted" : "ink");
  const textP = isHeading && action.underline ? phase(progress, 0, 0.8) : progress;

  return (
    <g opacity={progress > 0 ? 1 : 0}>
      {action.type === "annotation" && action.target ? (
        <AnnotationPointer layout={layout} target={action.target} color={color} progress={progress} />
      ) : null}
      <text
        x={action.x}
        y={action.y}
        textAnchor={layout.anchor}
        fontFamily={isFormula ? "var(--font-formula)" : "var(--font-board)"}
        fontStyle={isFormula ? "italic" : undefined}
        fontSize={layout.fontSize}
        fontWeight={isHeading ? 700 : 400}
        fill={ink(color)}
        opacity={0.15 + 0.85 * textP}
        style={progress < 1 ? { clipPath: `inset(-20% ${(1 - textP) * 100}% -20% 0)` } : undefined}
      >
        {layout.lines.map((line, i) => (
          <tspan key={i} x={action.x} dy={i === 0 ? 0 : layout.lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
      {isHeading && action.underline ? (
        <path
          d={underlinePath(layout, action)}
          fill="none"
          stroke={ink(action.color === "ink" || !action.color ? "blue" : action.color)}
          strokeWidth={STROKE}
          strokeLinecap="round"
          {...drawProps(phase(progress, 0.55, 1))}
        />
      ) : null}
    </g>
  );
}

function underlinePath(layout, action) {
  const { bounds, lines, lineHeight } = layout;
  const y = action.y + (lines.length - 1) * lineHeight + layout.fontSize * 0.28;
  const x1 = bounds.x;
  const x2 = bounds.x + Math.min(bounds.width, 900);
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y + 2} Q ${mid} ${y - 4} ${x2} ${y + 1}`;
}

function AnnotationPointer({ layout, target, color, progress }) {
  const b = layout.bounds;
  const box = { x: b.x + b.width / 2, y: b.y + b.height / 2, shape: "rect", hw: b.width / 2, hh: b.height / 2 };
  const start = boundaryPoint(box, target, 8);
  const geom = arrowGeometry(start, target, 0.2, 12);
  return (
    <g stroke={ink(color)} fill="none" strokeWidth={2.2} strokeLinecap="round" strokeDasharray={progress < 1 ? undefined : "6 7"}>
      <path d={geom.d} {...drawProps(progress)} />
      <circle cx={target.x} cy={target.y} r={4} fill={ink(color)} stroke="none" opacity={progress >= 0.9 ? 1 : 0} />
    </g>
  );
}

function ArrowElement({ action, progress }) {
  const geom = arrowGeometry(action.from, action.to, action.type === "arrow" ? action.curve : 0);
  const color = ink(action.color);
  const lineP = action.type === "arrow" ? phase(progress, 0, 0.82) : progress;
  return (
    <g fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path
        d={geom.d}
        strokeDasharray={action.dashed && progress >= 1 ? "12 10" : undefined}
        {...(action.dashed && progress >= 1 ? {} : drawProps(lineP))}
      />
      {action.type === "arrow" ? (
        <polyline
          points={geom.head.map((p) => `${p.x},${p.y}`).join(" ")}
          {...drawProps(phase(progress, 0.8, 1))}
        />
      ) : null}
      {action.label && progress >= 0.85 ? (
        <Label
          x={geom.labelAt.x}
          y={geom.labelAt.y}
          anchor={geom.vertical ? "start" : "middle"}
          size={24}
          color={action.color}
        >
          {action.label}
        </Label>
      ) : null}
    </g>
  );
}

function ShapeElement({ action, progress }) {
  const color = ink(action.color);
  const strokeP = phase(progress, 0, 0.8);
  const fillP = phase(progress, 0.6, 1);
  const common = {
    stroke: color,
    strokeWidth: STROKE,
    fill: action.fill ? tint(action.color, 14 * fillP) : "none",
    strokeLinecap: "round",
    ...drawProps(strokeP),
  };
  let shape;
  let labelWidth;
  if (action.type === "circle") {
    shape = <circle cx={action.x} cy={action.y} r={action.r} {...common} />;
    labelWidth = action.r * 1.7;
  } else if (action.type === "ellipse") {
    shape = <ellipse cx={action.x} cy={action.y} rx={action.rx} ry={action.ry} {...common} />;
    labelWidth = action.rx * 1.6;
  } else {
    shape = (
      <rect
        x={action.x}
        y={action.y}
        width={action.width}
        height={action.height}
        rx={action.rounded ? 14 : 2}
        {...common}
      />
    );
    labelWidth = action.width;
  }
  const cx = action.type === "rectangle" ? action.x + action.width / 2 : action.x;
  const cy = action.type === "rectangle" ? action.y + action.height / 2 : action.y;
  const r = action.type === "circle" ? action.r : action.type === "ellipse" ? action.ry : action.height / 2;
  const outside = action.label && r < 34 && action.label.length > 3;
  return (
    <g>
      {shape}
      {action.label ? (
        <g opacity={fillP}>
          {outside ? (
            <Label x={cx} y={cy + r + 22} size={24} color={action.color}>
              {action.label}
            </Label>
          ) : (
            <ShapeLabel x={cx} y={cy} text={action.label} width={labelWidth} color={action.color} />
          )}
        </g>
      ) : null}
    </g>
  );
}

function NodesElement({ action, progress, hiddenNodes }) {
  const pts = nodePositions(action);
  const r = action.radius ?? 26;
  const hidden = new Set(hiddenNodes || []);
  const color = action.color ?? "blue";
  const each = 1 / pts.length;
  const bounds = elementBounds(action);
  const captionP = phase(progress, 0.7, 1);
  return (
    <g>
      {pts.map((p, i) => {
        if (hidden.has(i)) return null;
        const np = phase(progress, i * each * 0.7, i * each * 0.7 + each * 1.3);
        if (np <= 0) return null;
        const s = 0.6 + 0.4 * np;
        return (
          <g key={i} transform={`translate(${p.x} ${p.y}) scale(${s})`} opacity={np}>
            <circle r={r} fill={tint(color, 14)} stroke={ink(color)} strokeWidth={STROKE} />
            {action.labels?.[i] ? (
              <Label x={0} y={1} size={Math.min(26, r * 0.9)} color={color} halo={false}>
                {action.labels[i]}
              </Label>
            ) : null}
          </g>
        );
      })}
      {action.label ? (
        <g opacity={captionP}>
          <Label
            x={bounds.x + bounds.width / 2}
            y={action.direction === "horizontal" ? bounds.y + bounds.height + 26 : bounds.y + bounds.height + 28}
            size={26}
            color={color}
          >
            {action.label}
          </Label>
        </g>
      ) : null}
    </g>
  );
}

function ConnectElement({ action, progress, elementIndex }) {
  const edges = connectionEdges(action, elementIndex);
  if (!edges.length) return null;
  const color = ink(action.color ?? "muted");
  const many = edges.length > 6;
  const each = 1 / edges.length;
  const mid = midpointOf(action, elementIndex);
  return (
    <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" opacity={many ? 0.75 : 1}>
      {edges.map((e, i) => {
        const ep = phase(progress, i * each * 0.6, i * each * 0.6 + 0.45);
        const geom = arrowGeometry(e.from, e.to, 0, many ? 10 : 14);
        return (
          <g key={i} strokeWidth={many ? 1.8 : 2.8}>
            <path d={geom.d} {...drawProps(phase(ep, 0, 0.85))} />
            {action.arrow ? (
              <polyline
                points={geom.head.map((p) => `${p.x},${p.y}`).join(" ")}
                {...drawProps(phase(ep, 0.8, 1))}
              />
            ) : null}
          </g>
        );
      })}
      {action.label && mid && progress >= 0.9 ? (
        <Label x={mid.x} y={mid.y - 18} size={24} color={action.color ?? "muted"}>
          {action.label}
        </Label>
      ) : null}
    </g>
  );
}

function midpointOf(action, elementIndex) {
  const a = resolveAnchors(action.from, elementIndex);
  const b = resolveAnchors(action.to, elementIndex);
  if (!a.length || !b.length) return null;
  const avg = (pts) => ({
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: Math.min(...pts.map((p) => p.y)),
  });
  const pa = avg(a);
  const pb = avg(b);
  return { x: (pa.x + pb.x) / 2, y: Math.min(pa.y, pb.y) };
}

function HighlightElement({ action, progress, elementIndex }) {
  let box;
  if (action.target) {
    const [id, index] = String(action.target).split("#");
    const el = elementIndex.get(id);
    if (!el) return null;
    if (index !== undefined && el.action.type === "drawNodes") {
      const p = nodePositions(el.action)[Number(index)];
      const r = (el.action.radius ?? 26) + 12;
      box = p && { x: p.x - r, y: p.y - r, width: r * 2, height: r * 2 };
    } else {
      const b = elementBounds(el.action);
      box = b && { x: b.x - 12, y: b.y - 10, width: b.width + 24, height: b.height + 20 };
    }
  } else {
    box = { x: action.x, y: action.y, width: action.width, height: action.height };
  }
  if (!box) return null;
  return (
    <rect
      x={box.x}
      y={box.y}
      width={box.width * clamp01(progress * 1.2)}
      height={box.height}
      rx={8}
      fill={action.color && action.color !== "ink" ? tint(action.color, 22) : "var(--marker-highlight)"}
      className="marker-blend"
    />
  );
}

function GraphElement({ action, progress }) {
  const g = graphLayout(action);
  const { plot } = g;
  const axisP = phase(progress, 0, 0.3);
  const dataP = phase(progress, 0.3, 1);
  const muted = "var(--ink-muted)";
  return (
    <g>
      {action.title ? (
        <Label x={action.x + action.width / 2} y={action.y + 16} size={28} weight={700} color={action.color}>
          {action.title}
        </Label>
      ) : null}
      <g stroke={ink()} strokeWidth={2.6} fill="none" strokeLinecap="round">
        <path d={`M ${plot.x} ${plot.y - 6} L ${plot.x} ${plot.y + plot.height}`} {...drawProps(axisP)} />
        <path
          d={`M ${plot.x} ${plot.y + plot.height} L ${plot.x + plot.width + 6} ${plot.y + plot.height}`}
          {...drawProps(axisP)}
        />
      </g>
      <g opacity={axisP}>
        {g.yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={plot.x} x2={plot.x + plot.width} y1={g.sy(t)} y2={g.sy(t)} stroke="var(--board-grid)" strokeWidth={1.5} />
            <Label x={plot.x - 10} y={g.sy(t)} size={18} anchor="end" color="muted" halo={false}>
              {formatTick(t)}
            </Label>
          </g>
        ))}
        {action.kind !== "bar"
          ? g.xTicks.map((t) => (
              <Label key={`x${t}`} x={g.sx(t)} y={plot.y + plot.height + 20} size={18} color="muted" halo={false}>
                {formatTick(t)}
              </Label>
            ))
          : null}
        {action.xLabel ? (
          <Label x={plot.x + plot.width / 2} y={plot.y + plot.height + 46} size={22} color="muted" halo={false}>
            {action.xLabel}
          </Label>
        ) : null}
        {action.yLabel ? (
          <g transform={`translate(${action.x + 14} ${plot.y + plot.height / 2}) rotate(-90)`}>
            <Label x={0} y={0} size={22} color="muted" halo={false}>
              {action.yLabel}
            </Label>
          </g>
        ) : null}
      </g>

      {action.kind === "bar"
        ? g.bars.map((b, i) => {
            const bp = phase(dataP, (i / g.bars.length) * 0.6, (i / g.bars.length) * 0.6 + 0.4);
            const h = b.height * bp;
            return (
              <g key={i}>
                <rect
                  x={b.x}
                  y={b.y + (b.height - h)}
                  width={b.width}
                  height={h}
                  rx={4}
                  fill={tint(action.color ?? "blue", 30)}
                  stroke={ink(action.color ?? "blue")}
                  strokeWidth={2.4}
                />
                <Label x={b.x + b.width / 2} y={plot.y + plot.height + 20} size={18} color="muted" halo={false}>
                  {b.label}
                </Label>
              </g>
            );
          })
        : g.series.map((s, si) => {
            const color = s.color ?? (si === 0 ? action.color ?? "blue" : ["red", "green", "orange"][si - 1]);
            const pts = s.screen;
            if (action.kind === "scatter") {
              return pts.map((p, i) =>
                i / pts.length < dataP ? (
                  <circle key={`${si}-${i}`} cx={p.x} cy={p.y} r={6} fill={ink(color)} />
                ) : null
              );
            }
            const last = pts[pts.length - 1];
            return (
              <g key={si}>
                <path
                  d={`M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
                  fill="none"
                  stroke={ink(color)}
                  strokeWidth={3.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  {...drawProps(dataP)}
                />
                {s.label && dataP >= 1 ? (
                  <Label x={Math.min(last.x, plot.x + plot.width) - 4} y={last.y - 18} anchor="end" size={22} color={color}>
                    {s.label}
                  </Label>
                ) : null}
              </g>
            );
          })}
    </g>
  );
}

function BoardElementImpl({ element, progress = 1, elementIndex }) {
  const { action } = element;
  switch (action.type) {
    case "heading":
    case "text":
    case "formula":
    case "annotation":
      return <TextElement action={action} progress={progress} />;
    case "line":
    case "arrow":
      return <ArrowElement action={action} progress={progress} />;
    case "circle":
    case "ellipse":
    case "rectangle":
      return <ShapeElement action={action} progress={progress} />;
    case "drawNodes":
      return <NodesElement action={action} progress={progress} hiddenNodes={element.hiddenNodes} />;
    case "connectNodes":
      return <ConnectElement action={action} progress={progress} elementIndex={elementIndex} />;
    case "highlight":
      return <HighlightElement action={action} progress={progress} elementIndex={elementIndex} />;
    case "graph":
      return <GraphElement action={action} progress={progress} />;
    default:
      return null;
  }
}

const BoardElement = memo(BoardElementImpl);

export default BoardElement;
