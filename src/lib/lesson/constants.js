export const BOARD = Object.freeze({ width: 1600, height: 900, margin: 40 });

export const INK_COLORS = Object.freeze([
  "ink",
  "blue",
  "red",
  "green",
  "orange",
  "purple",
  "muted",
]);

export const ACTION_TYPES = Object.freeze([
  "heading",
  "text",
  "annotation",
  "formula",
  "line",
  "arrow",
  "circle",
  "ellipse",
  "rectangle",
  "drawNodes",
  "connectNodes",
  "highlight",
  "graph",
  "erase",
  "clear",
]);

export const LIMITS = Object.freeze({
  topicMaxChars: 200,
  questionMaxChars: 600,
  minSegments: 3,
  maxSegments: 12,
  maxActionsPerSegment: 12,
  maxHistoryTurns: 8,
});

export const WORDS_PER_SECOND = 2.5;
