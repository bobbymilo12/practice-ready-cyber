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
