import { buildBoardState } from "@/lib/whiteboard/board-state";

function naturalDuration(a) {
  const len = (a.content || a.label || "").length;
  switch (a.type) {
    case "heading":
      return 1.1 + len * 0.025;
    case "text":
    case "formula":
      return 0.7 + len * 0.03;
    case "annotation":
      return 0.9 + len * 0.025;
    case "line":
      return 0.7;
    case "arrow":
      return 0.9;
    case "circle":
    case "ellipse":
    case "rectangle":
      return 1.0;
    case "drawNodes":
      return 0.5 + a.count * 0.3;
    case "connectNodes":
      return 1.6;
    case "highlight":
      return 0.6;
    case "graph":
      return 2.6;
    case "erase":
      return 0.35;
    case "clear":
      return 0.25;
    default:
      return 0.8;
  }
}

const STOPWORDS = new Set(
  "this that with from have will your what when where which their there then than them they these those into onto over under about after before because while each every some more most very just like also only here the and for are was were been being can could would should does did not but how why who".split(
    " "
  )
);

const normalizeWord = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

function actionKeywords(a) {
  const refs = [a.id, a.from, a.to, a.target].filter(Boolean).flatMap((r) => String(r).split(/[^\p{L}]+/u));
  const parts = [a.content, a.label, a.title, a.xLabel, a.yLabel, ...(a.labels || []), ...(a.series || []).map((s) => s.label), ...refs];
  const words = parts
    .filter(Boolean)
    .join(" ")
    .split(/\s+/)
    .map(normalizeWord)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  return [...new Set(words)];
}

const sameStem = (a, b) =>
  a.length >= 4 &&
  b.length >= 4 &&
  (a.startsWith(b.slice(0, Math.max(4, b.length - 2))) || b.startsWith(a.slice(0, Math.max(4, a.length - 2))));

export function scheduleSegment(actions, duration, text = "") {
  if (!actions.length) return [];
  const lead = Math.min(0.35, duration * 0.08);
  const windowEnd = Math.max(lead + 0.5, duration * 0.9);
  const natural = actions.map(naturalDuration);
  const words = String(text).split(/\s+/).map(normalizeWord).filter(Boolean);
  const speechTime = (index) => 0.15 + (index / Math.max(1, words.length)) * duration * 0.92;

  const starts = new Array(actions.length).fill(null);
  let fromWord = 0;
  let lastStart = -Infinity;
  for (let i = 0; i < actions.length; i++) {
    const keys = actionKeywords(actions[i]);
    let hit = -1;
    for (let w = fromWord; w < words.length && hit === -1; w++) {
      if (keys.some((k) => sameStem(words[w], k))) hit = w;
    }
    if (hit === -1) {
      if (i === 0) starts[0] = lastStart = lead;
      continue;
    }
    const spoken = speechTime(hit) - 0.4;
    const t =
      i === 0
        ? Math.max(lead, Math.min(spoken, duration * 0.3))
        : Math.min(windowEnd - 0.3, Math.max(lastStart + 0.3, spoken));
    if (t <= lastStart) continue;
    starts[i] = lastStart = t;
    fromWord = hit + 1;
  }

  for (let i = 1; i < actions.length; i++) {
    if (starts[i] !== null) continue;
    let j = i;
    while (j < actions.length && starts[j] === null) j++;
    const left = starts[i - 1] + Math.min(natural[i - 1], 1.2);
    const right = j < actions.length ? starts[j] - 0.2 : windowEnd - Math.min(natural[j - 1], 1.5);
    const span = Math.max(0, right - left);
    const count = j - i;
    for (let k = 0; k < count; k++) {
      starts[i + k] = Math.max(starts[i + k - 1] + 0.15, left + (count === 1 ? 0 : (span * k) / count));
    }
    i = j - 1;
  }

  return starts.map((start, i) => {
    const next = i + 1 < starts.length ? starts[i + 1] : windowEnd;
    const length = Math.max(0.25, Math.min(natural[i], Math.max(next - start, natural[i] * 0.5)));
    return { start, end: Math.min(start + length, Math.max(start + 0.25, duration)) };
  });
}

export function computeTimeline(durations) {
  const starts = [];
  let total = 0;
  for (const d of durations) {
    starts.push(total);
    total += d;
  }
  return { starts, total };
}

export function locate(time, durations) {
  const { starts, total } = computeTimeline(durations);
  const t = Math.min(Math.max(0, time), total);
  for (let i = durations.length - 1; i >= 0; i--) {
    if (t >= starts[i]) {
      return { segmentIndex: i, segmentTime: Math.min(t - starts[i], durations[i]) };
    }
  }
  return { segmentIndex: 0, segmentTime: 0 };
}

export function boardAt(actionLists, schedules, position) {
  const actionCount = startedActionCount(schedules, position);
  return { ...buildBoardState(actionLists, { segmentIndex: position.segmentIndex, actionCount }), actionCount };
}

export function startedActionCount(schedules, { segmentIndex, segmentTime, complete = false }) {
  const schedule = schedules[segmentIndex] || [];
  return complete ? schedule.length : schedule.filter((slot) => slot.start <= segmentTime).length;
}

export function elementProgress(element, schedules, { segmentIndex, segmentTime, complete }, reducedMotion) {
  if (complete || element.segmentIndex < segmentIndex) return 1;
  const slot = schedules[element.segmentIndex]?.[element.actionIndex];
  if (!slot) return 1;
  if (segmentTime >= slot.end) return 1;
  if (segmentTime < slot.start) return 0;
  if (reducedMotion) return 1;
  const p = (segmentTime - slot.start) / (slot.end - slot.start);
  return 1 - (1 - p) * (1 - p);
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
