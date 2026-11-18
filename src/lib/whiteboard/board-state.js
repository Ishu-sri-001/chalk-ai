import { splitRef } from "@/lib/whiteboard/refs";
import { elementBounds } from "@/lib/whiteboard/geometry";

export function buildBoardState(actionLists, { segmentIndex, actionCount = Infinity }) {
  let elements = [];
  const last = Math.min(segmentIndex, actionLists.length - 1);

  for (let s = 0; s <= last; s++) {
    const actions = actionLists[s] || [];
    const limit = s === last ? Math.min(actionCount, actions.length) : actions.length;

    for (let i = 0; i < limit; i++) {
      const action = actions[i];
      if (action.type === "clear") {
        elements = [];
        continue;
      }
      if (action.type === "erase") {
        elements = applyErase(elements, action);
        continue;
      }
      if (action.type === "highlight" && !action.persist && s !== last) continue;
      elements.push({ key: `${s}:${i}:${action.id}`, action, segmentIndex: s, actionIndex: i });
    }
  }
  return { elements };
}

function applyErase(elements, erase) {
  if (erase.target) {
    const { id, index } = splitRef(erase.target);
    if (index !== null) {
      return elements.map((el) =>
        el.action.id === id && el.action.type === "drawNodes"
          ? { ...el, hiddenNodes: [...(el.hiddenNodes || []), index] }
          : el
      );
    }
    return elements.filter(
      (el) =>
        el.action.id !== id &&
        !(
          el.action.type === "connectNodes" &&
          (splitRef(el.action.from).id === id || splitRef(el.action.to).id === id)
        ) &&
        !(el.action.type === "highlight" && el.action.target && splitRef(el.action.target).id === id)
    );
  }
  const region = { x: erase.x, y: erase.y, width: erase.width, height: erase.height };
  return elements.filter((el) => {
    const b = elementBounds(el.action);
    if (!b) return true;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    return !(
      cx >= region.x &&
      cx <= region.x + region.width &&
      cy >= region.y &&
      cy <= region.y + region.height
    );
  });
}

export function buildElementIndex(elements) {
  const index = new Map();
  for (const el of elements) {
    if (el.action.id) index.set(el.action.id, el);
  }
  return index;
}
