/** Presentation-only pairing operation. It has no access to answer keys. */
export function pairCards(
  current: Record<string, string>,
  itemId: string,
  targetId: string,
  oneToOne: boolean,
): Record<string, string> {
  const next = { ...current };
  if (next[itemId] === targetId) {
    delete next[itemId];
    return next;
  }
  if (oneToOne) {
    for (const [item, target] of Object.entries(next)) if (target === targetId) delete next[item];
  }
  next[itemId] = targetId;
  return next;
}
/** The one valid one-to-one pairing, or undefined when there are none or several. */
export function uniqueMatching(
  items: string[],
  targets: string[],
  edges: Record<string, string[]>,
): Record<string, string> | undefined {
  let count = 0;
  let solution: Record<string, string> | undefined;
  function visit(index: number, used: Set<string>, pairs: Record<string, string>) {
    if (count > 1) return;
    if (index === items.length) {
      count++;
      solution = { ...pairs };
      return;
    }
    const id = items[index];
    for (const target of targets) {
      if (!used.has(target) && edges[id]?.includes(target)) {
        used.add(target);
        pairs[id] = target;
        visit(index + 1, used, pairs);
        used.delete(target);
        delete pairs[id];
      }
    }
  }
  visit(0, new Set(), {});
  return count === 1 ? solution : undefined;
}
