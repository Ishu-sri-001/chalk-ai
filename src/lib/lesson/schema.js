import { z } from "zod";
import { INK_COLORS, LIMITS } from "@/lib/lesson/constants";

const num = z.coerce.number().refine(Number.isFinite, "must be a finite number");
const str = (max) => z.string().trim().min(1).max(max);
const optStr = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const color = z.enum(INK_COLORS).catch("ink");
const align = z.enum(["start", "middle", "end"]).catch("start");
const size = z.enum(["sm", "md", "lg"]).catch("md");
const bool = (fallback) => z.boolean().catch(fallback).default(fallback);

export const pointSchema = z.object({ x: num, y: num });

const base = {
  id: optStr(60),
  color: color.optional(),
};

const pairSchema = z.union([
  z.tuple([num, num]),
  pointSchema.transform((p) => [p.x, p.y]),
]);

const rangeSchema = z
  .tuple([num, num])
  .refine(([a, b]) => b > a, "range max must be greater than min");

export const actionSchemas = {
  heading: z.object({
    ...base,
    type: z.literal("heading"),
    content: str(90),
    x: num,
    y: num,
    align: align.default("start"),
    size: size.default("lg"),
    underline: bool(true),
  }),
  text: z.object({
    ...base,
    type: z.literal("text"),
    content: str(260),
    x: num,
    y: num,
    align: align.default("start"),
    size: size.default("md"),
    maxWidth: num.optional(),
  }),
  annotation: z.object({
    ...base,
    type: z.literal("annotation"),
    content: str(160),
    x: num,
    y: num,
    target: pointSchema.optional(),
  }),
  formula: z.object({
    ...base,
    type: z.literal("formula"),
    content: str(140),
    x: num,
    y: num,
    align: align.default("start"),
    size: size.default("md"),
  }),
  line: z.object({
    ...base,
    type: z.literal("line"),
    from: pointSchema,
    to: pointSchema,
    dashed: bool(false),
  }),
  arrow: z.object({
    ...base,
    type: z.literal("arrow"),
    from: pointSchema,
    to: pointSchema,
    label: optStr(60),
    curve: num.catch(0).default(0),
    dashed: bool(false),
  }),
  circle: z.object({
    ...base,
    type: z.literal("circle"),
    x: num,
    y: num,
    r: num,
    label: optStr(60),
    fill: bool(false),
  }),
  ellipse: z.object({
    ...base,
    type: z.literal("ellipse"),
    x: num,
    y: num,
    rx: num,
    ry: num,
    label: optStr(60),
    fill: bool(false),
  }),
  rectangle: z.object({
    ...base,
    type: z.literal("rectangle"),
    x: num,
    y: num,
    width: num,
    height: num,
    label: optStr(80),
    fill: bool(false),
    rounded: bool(true),
  }),
  drawNodes: z.object({
    ...base,
    type: z.literal("drawNodes"),
    x: num,
    y: num,
    count: z.coerce.number().int().min(1).max(8),
    direction: z.enum(["vertical", "horizontal"]).catch("vertical").default("vertical"),
    spacing: num.optional(),
    radius: num.optional(),
    labels: z.array(z.string().trim().max(24)).max(8).optional(),
    label: optStr(40),
  }),
  connectNodes: z.object({
    ...base,
    type: z.literal("connectNodes"),
    from: str(80),
    to: str(80),
    mode: z.enum(["all", "pairwise"]).catch("all").default("all"),
    label: optStr(40),
    arrow: bool(true),
  }),
  highlight: z
    .object({
      ...base,
      type: z.literal("highlight"),
      target: optStr(80),
      x: num.optional(),
      y: num.optional(),
      width: num.optional(),
      height: num.optional(),
      persist: bool(false),
    })
    .refine(
      (a) => a.target || [a.x, a.y, a.width, a.height].every((v) => v !== undefined),
      "highlight needs a target id or x, y, width and height"
    ),
  graph: z
    .object({
      ...base,
      type: z.literal("graph"),
      x: num,
      y: num,
      width: num,
      height: num,
      kind: z.enum(["line", "scatter", "bar"]).catch("line").default("line"),
      title: optStr(60),
      xLabel: optStr(40),
      yLabel: optStr(40),
      xRange: rangeSchema.optional().catch(undefined),
      yRange: rangeSchema.optional().catch(undefined),
      series: z
        .array(
          z.object({
            label: optStr(30),
            color: color.optional(),
            points: z.array(pairSchema).min(2).max(80),
          })
        )
        .max(4)
        .optional(),
      bars: z
        .array(z.object({ label: z.string().trim().max(20), value: num }))
        .min(1)
        .max(12)
        .optional(),
    })
    .refine(
      (g) => (g.kind === "bar" ? g.bars?.length : g.series?.length),
      "graph needs series (line/scatter) or bars (bar)"
    ),
  erase: z
    .object({
      ...base,
      type: z.literal("erase"),
      target: optStr(80),
      x: num.optional(),
      y: num.optional(),
      width: num.optional(),
      height: num.optional(),
    })
    .refine(
      (a) => a.target || [a.x, a.y, a.width, a.height].every((v) => v !== undefined),
      "erase needs a target id or x, y, width and height"
    ),
  clear: z.object({ type: z.literal("clear"), id: optStr(60) }),
};

function normalizeTarget(raw) {
  if (!raw || (raw.type !== "highlight" && raw.type !== "erase")) return raw;
  const t = raw.target;
  if (!t || typeof t !== "object") return raw;
  const { target: _ignored, ...rest } = raw;
  if (typeof t.id === "string" && t.id.trim()) return { ...rest, target: t.id };
  const x = Number(t.x);
  const y = Number(t.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return rest;
  const width = Number(t.width);
  const height = Number(t.height);
  if (Number.isFinite(width) && Number.isFinite(height)) return { ...rest, x, y, width, height };
  return { ...rest, x: x - 70, y: y - 45, width: 140, height: 90 };
}

export function parseAction(input) {
  const raw = normalizeTarget(input);
  const type = raw && typeof raw === "object" ? raw.type : undefined;
  const schema = actionSchemas[type];
  if (!schema) {
    return {
      success: false,
      error: `unknown action type "${String(type)}"`,
    };
  }
  const result = schema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: formatIssues(result.error.issues).join("; ") };
}

export const segmentShellSchema = z.object({
  id: optStr(40),
  title: str(90),
  text: str(1200),
  visualActions: z.array(z.unknown()).max(LIMITS.maxActionsPerSegment * 2).default([]),
});

export const lessonShellSchema = z.object({
  topic: str(160),
  title: optStr(120),
  introduction: str(600),
  objectives: z.array(str(200)).min(1).max(6),
  segments: z.array(segmentShellSchema).min(LIMITS.minSegments).max(LIMITS.maxSegments),
  conclusion: str(600),
  followUpQuestions: z.array(str(200)).max(6).default([]),
  relatedTopics: z.array(str(80)).max(6).catch([]).default([]),
  duration: num.optional(),
});

export const followUpShellSchema = z.object({
  answer: str(2000),
  visualActions: z.array(z.unknown()).max(LIMITS.maxActionsPerSegment * 2).default([]),
  suggestions: z.array(str(200)).max(4).default([]),
});

export function formatIssues(issues) {
  return issues.slice(0, 12).map((issue) => {
    const path = issue.path?.length ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}
