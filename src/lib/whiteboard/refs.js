export function sanitizeId(id) {
  return String(id)
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function resolveRef(ref, knownIds, nodeCounts) {
  if (!ref) return null;
  const raw = String(ref).trim();
  const exact = sanitizeId(raw);
  if (knownIds.has(exact)) return exact;

  const match = raw.match(/^(.+?)\s*(?:\.|\[|-|#|:|_)\s*(\d+)\]?$/);
  if (!match) return null;
  const groupId = sanitizeId(match[1]);
  const count = nodeCounts.get(groupId);
  if (count === undefined) return null;
  let index = Number(match[2]);
  if (index >= count && index - 1 < count) index -= 1;
  if (index < 0 || index >= count) return null;
  return `${groupId}#${index}`;
}

export function splitRef(ref) {
  const [id, index] = String(ref).split("#");
  return { id, index: index === undefined ? null : Number(index) };
}
