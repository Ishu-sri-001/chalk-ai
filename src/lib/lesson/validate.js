import { BOARD, LIMITS, WORDS_PER_SECOND } from "@/lib/lesson/constants";
import {
  followUpShellSchema,
  formatIssues,
  lessonShellSchema,
  parseAction,
} from "@/lib/lesson/schema";
import { resolveRef, sanitizeId } from "@/lib/whiteboard/refs";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const W = BOARD.width;
const H = BOARD.height;
const M = BOARD.margin;

const clampX = (x) => clamp(x, M / 2, W - M / 2);
const clampY = (y) => clamp(y, M / 2, H - M / 2);
const clampPoint = (p) => ({ x: clampX(p.x), y: clampY(p.y) });

function fitBox(x, y, width, height) {
  const w = clamp(width, 10, W - M * 2);
  const h = clamp(height, 10, H - M * 2);
  return {
    x: clamp(x, M, W - M - w),
    y: clamp(y, M, H - M - h),
    width: w,
    height: h,
  };
}

export function countWords(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

export function estimateSeconds(text) {
  return Math.max(4, Math.round((countWords(text) / WORDS_PER_SECOND + 0.6) * 10) / 10);
}

function normalizeGeometry(a) {
  switch (a.type) {
    case "heading":
    case "text":
    case "formula":
    case "annotation": {
      const out = { ...a, x: clampX(a.x), y: clamp(a.y, M, H - M / 2) };
      if (a.target) out.target = clampPoint(a.target);
      if (a.maxWidth !== undefined) out.maxWidth = clamp(a.maxWidth, 120, W - M * 2);
      return out;
    }
    case "line":
    case "arrow":
      return {
        ...a,
        from: clampPoint(a.from),
        to: clampPoint(a.to),
        curve: a.curve !== undefined ? clamp(a.curve, -1, 1) : a.curve,
      };
    case "circle": {
      const r = clamp(a.r, 8, 320);
      return { ...a, r, x: clamp(a.x, r + 4, W - r - 4), y: clamp(a.y, r + 4, H - r - 4) };
    }
    case "ellipse": {
      const rx = clamp(a.rx, 10, 600);
      const ry = clamp(a.ry, 8, 400);
      return {
        ...a,
        rx,
        ry,
        x: clamp(a.x, rx + 4, W - rx - 4),
        y: clamp(a.y, ry + 4, H - ry - 4),
      };
    }
    case "rectangle":
      return { ...a, ...fitBox(a.x, a.y, a.width, a.height) };
    case "graph": {
      const box = fitBox(a.x, a.y, clamp(a.width, 220, W), clamp(a.height, 160, H));
      return { ...a, ...box };
    }
    case "drawNodes": {
      const radius = clamp(a.radius ?? 26, 12, 48);
      const extent = (a.direction === "horizontal" ? W : H) - M * 2 - radius * 2;
      const maxSpacing = a.count > 1 ? extent / (a.count - 1) : 0;
      const spacing = clamp(a.spacing ?? 100, radius * 2 + 8, Math.max(radius * 2 + 8, maxSpacing));
      const span = (a.count - 1) * spacing;
      const halfW = (a.direction === "horizontal" ? span / 2 : 0) + radius + 4;
      const halfH = (a.direction === "vertical" ? span / 2 : 0) + radius + 4;
      return {
        ...a,
        radius,
        spacing,
        x: clamp(a.x, halfW, W - halfW),
        y: clamp(a.y, halfH, H - halfH),
      };
    }
    case "highlight":
    case "erase":
      if (a.target) return a;
      return { ...a, ...fitBox(a.x, a.y, a.width, a.height) };
    default:
      return a;
  }
}

function normalizeActions(rawActions, ctx, label) {
  const actions = [];
  rawActions.slice(0, LIMITS.maxActionsPerSegment).forEach((raw, i) => {
    const parsed = parseAction(raw);
    if (!parsed.success) {
      ctx.warnings.push(`${label} action ${i + 1} dropped: ${parsed.error}`);
      ctx.dropped += 1;
      return;
    }
    let a = normalizeGeometry(parsed.data);

    if (a.type === "connectNodes") {
      const from = resolveRef(a.from, ctx.ids, ctx.nodeCounts);
      const to = resolveRef(a.to, ctx.ids, ctx.nodeCounts);
      if (!from || !to) {
        ctx.warnings.push(
          `${label} action ${i + 1} dropped: connectNodes references unknown "${!from ? a.from : a.to}"`
        );
        ctx.dropped += 1;
        return;
      }
      a = { ...a, from, to };
    }
    if ((a.type === "highlight" || a.type === "erase") && a.target) {
      const target = resolveRef(a.target, ctx.ids, ctx.nodeCounts);
      if (!target) {
        ctx.warnings.push(`${label} action ${i + 1} dropped: unknown target "${a.target}"`);
        ctx.dropped += 1;
        return;
      }
      a = { ...a, target };
    }

    let id = a.id ? sanitizeId(a.id) : "";
    if (!id) id = `${a.type}-${ctx.counter}`;
    while (ctx.ids.has(id)) id = `${id}-${ctx.counter}`;
    ctx.counter += 1;
    ctx.ids.add(id);
    if (a.type === "drawNodes") ctx.nodeCounts.set(id, a.count);
    if (a.type === "drawNodes" && a.labels) a = { ...a, labels: a.labels.slice(0, a.count) };

    actions.push({ ...a, id });
    ctx.valid += 1;
  });
  if (rawActions.length > LIMITS.maxActionsPerSegment) {
    ctx.warnings.push(`${label}: only the first ${LIMITS.maxActionsPerSegment} actions were kept`);
  }
  return actions;
}

function newContext() {
  return { ids: new Set(), nodeCounts: new Map(), warnings: [], counter: 1, valid: 0, dropped: 0 };
}

export function getRefusal(raw) {
  if (raw && typeof raw === "object" && typeof raw.refusal === "string" && raw.refusal.trim()) {
    return raw.refusal.trim().slice(0, 300);
  }
  return null;
}

export function validateLesson(raw, { requestedTopic } = {}) {
  const shell = lessonShellSchema.safeParse(raw);
  if (!shell.success) {
    return {
      lesson: null,
      issues: formatIssues(shell.error.issues),
      qualityIssues: [],
      warnings: [],
    };
  }
  const data = shell.data;
  const ctx = newContext();
  const usedSegmentIds = new Set();

  const segments = data.segments.map((seg, index) => {
    let id = seg.id ? sanitizeId(seg.id) : "";
    if (!id || usedSegmentIds.has(id)) id = `segment-${index + 1}`;
    usedSegmentIds.add(id);
    const visualActions = normalizeActions(seg.visualActions, ctx, `Segment ${index + 1}`);
    return {
      id,
      index,
      title: seg.title,
      text: seg.text,
      wordCount: countWords(seg.text),
      estimatedDuration: estimateSeconds(seg.text),
      visualActions,
    };
  });

  const totalWords = segments.reduce((n, s) => n + s.wordCount, 0);
  const estimatedDuration =
    Math.round(segments.reduce((n, s) => n + s.estimatedDuration, 0) * 10) / 10;

  const qualityIssues = [];
  if (ctx.valid === 0) qualityIssues.push("No valid whiteboard actions were produced.");
  if (ctx.dropped > 0 && ctx.dropped >= ctx.valid) {
    qualityIssues.push(`${ctx.dropped} of ${ctx.valid + ctx.dropped} actions were invalid.`);
  }
  const silent = segments.filter((s) => s.visualActions.length === 0).length;
  if (silent > Math.ceil(segments.length / 3)) {
    qualityIssues.push(`${silent} segments have no whiteboard actions.`);
  }
  if (totalWords < 150) {
    qualityIssues.push(`Narration is too short (${totalWords} words; aim for 260-340).`);
  }
  if (totalWords > 520) {
    qualityIssues.push(`Narration is too long (${totalWords} words; aim for 260-340).`);
  }

  const lesson = {
    version: 1,
    topic: data.topic || requestedTopic,
    requestedTopic: requestedTopic ?? data.topic,
    title: data.title || data.topic,
    introduction: data.introduction,
    objectives: data.objectives,
    segments,
    conclusion: data.conclusion,
    followUpQuestions: data.followUpQuestions.slice(0, 4),
    relatedTopics: data.relatedTopics.slice(0, 4),
    estimatedDuration,
    totalWords,
  };

  return { lesson, issues: [], qualityIssues, warnings: ctx.warnings };
}

export function validateFollowUp(raw) {
  const shell = followUpShellSchema.safeParse(raw);
  if (!shell.success) {
    return { answer: null, issues: formatIssues(shell.error.issues), warnings: [] };
  }
  const ctx = newContext();
  const visualActions = normalizeActions(shell.data.visualActions, ctx, "Answer");
  return {
    answer: {
      text: shell.data.answer,
      visualActions,
      suggestions: shell.data.suggestions.slice(0, 3),
      estimatedDuration: estimateSeconds(shell.data.answer),
    },
    issues: [],
    warnings: ctx.warnings,
  };
}
