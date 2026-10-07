import type { PracticeData } from "./store";

export type OrderRequirement = "unassessed" | "required_linear" | "conditional_or_flexible";
interface Confirmation {
  id: string;
  requestId: string;
  requestLabelAtConfirmation: string;
  version: number;
  confirmedBy: string;
  confirmedAt: string;
}
export interface ProcedureContent {
  steps: { id: string; text: string }[];
  stepOrder: string[];
  appliesWhen: string;
  orderRequirement: OrderRequirement;
}
export type ProcedureRevision = Confirmation &
  ({ status: "no_specific_procedure" } | ({ status: "configured" } & ProcedureContent));
export type LocalProcedure = ProcedureRevision & { history?: ProcedureRevision[] };
export type LocalProcedures = Record<string, LocalProcedure>;
export interface ProcedureTarget {
  id: string;
  label: string;
  roles: string[];
  conflict: boolean;
}

/** Exact IDs only. Labels contextualise separate custom identities, never merge them. */
export function procedureTargets(p: Pick<PracticeData, "roleRequests">): ProcedureTarget[] {
  const targets = new Map<string, ProcedureTarget>();
  for (const role of Object.values(p.roleRequests ?? {})) {
    if (!role.confirmed || role.archived) continue;
    for (const request of role.categories.flatMap((c) => c.requests)) {
      if (!role.selectedRequestIds.includes(request.id)) continue;
      const previous = targets.get(request.id);
      if (previous) {
        previous.conflict ||= previous.label !== request.label;
        if (!previous.roles.includes(role.label)) previous.roles.push(role.label);
      } else
        targets.set(request.id, {
          id: request.id,
          label: request.label,
          roles: [role.label],
          conflict: false,
        });
    }
  }
  return [...targets.values()].sort(
    (a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id),
  );
}
export function procedureDraft(record?: LocalProcedure): ProcedureContent {
  return record?.status === "configured"
    ? structuredClone({
        steps: record.steps,
        stepOrder: record.stepOrder,
        appliesWhen: record.appliesWhen,
        orderRequirement: record.orderRequirement,
      })
    : { steps: [], stepOrder: [], appliesWhen: "", orderRequirement: "unassessed" };
}
export function addProcedureStep(
  draft: ProcedureContent,
  id = crypto.randomUUID(),
): ProcedureContent {
  return {
    ...draft,
    steps: [...draft.steps, { id, text: "" }],
    stepOrder: [...draft.stepOrder, id],
  };
}
export function removeProcedureStep(draft: ProcedureContent, id: string): ProcedureContent {
  return {
    ...draft,
    steps: draft.steps.filter((s) => s.id !== id),
    stepOrder: draft.stepOrder.filter((key) => key !== id),
  };
}
export function moveProcedureStep(
  draft: ProcedureContent,
  id: string,
  direction: -1 | 1,
): ProcedureContent {
  const order = [...draft.stepOrder],
    from = order.indexOf(id),
    to = from + direction;
  if (from < 0 || to < 0 || to >= order.length) return draft;
  [order[from], order[to]] = [order[to], order[from]];
  return { ...draft, stepOrder: order };
}
const object = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const nonempty = (v: unknown): v is string => typeof v === "string" && !!v.trim();
function revisionValid(r: unknown): r is ProcedureRevision {
  if (
    !object(r) ||
    !nonempty(r.id) ||
    !nonempty(r.requestId) ||
    !nonempty(r.requestLabelAtConfirmation) ||
    !Number.isInteger(r.version) ||
    r.version < 1 ||
    !nonempty(r.confirmedBy) ||
    !nonempty(r.confirmedAt) ||
    !Number.isFinite(Date.parse(r.confirmedAt))
  )
    return false;
  if (r.status === "no_specific_procedure")
    return !["steps", "stepOrder", "appliesWhen", "orderRequirement"].some((key) => key in r);
  if (
    r.status !== "configured" ||
    !Array.isArray(r.steps) ||
    !r.steps.length ||
    !Array.isArray(r.stepOrder) ||
    typeof r.appliesWhen !== "string" ||
    !["unassessed", "required_linear", "conditional_or_flexible"].includes(r.orderRequirement)
  )
    return false;
  if (
    r.steps.some(
      (s: unknown) => !object(s) || !nonempty(s.id) || !nonempty(s.text) || s.text.length > 10000,
    )
  )
    return false;
  const ids = r.steps.map((s: { id: string }) => s.id);
  return (
    new Set(ids).size === ids.length &&
    r.stepOrder.length === ids.length &&
    new Set(r.stepOrder).size === ids.length &&
    r.stepOrder.every((id: unknown) => typeof id === "string" && ids.includes(id))
  );
}
export function validateLocalProcedures(value: unknown): void {
  if (value === undefined) return; // Old practice snapshots remain valid.
  if (!object(value)) throw new Error("Invalid local procedures.");
  const procedureIds = new Set<string>();
  for (const [key, record] of Object.entries(value)) {
    if (!revisionValid(record) || record.requestId !== key || procedureIds.has(record.id))
      throw new Error(
        "Each local procedure needs a valid request, confirmation and explicit step order.",
      );
    procedureIds.add(record.id);
    const history = (record as LocalProcedure).history;
    if (
      history !== undefined &&
      (!Array.isArray(history) ||
        history.some(
          (r, i) =>
            !revisionValid(r) ||
            r.id !== record.id ||
            r.requestId !== key ||
            r.version >= record.version ||
            (i > 0 && r.version <= history[i - 1].version) ||
            "history" in r,
        ))
    )
      throw new Error("Invalid local procedure history.");
  }
}
function content(record: ProcedureRevision) {
  return record.status === "configured"
    ? {
        status: record.status,
        label: record.requestLabelAtConfirmation,
        steps: record.steps,
        stepOrder: record.stepOrder,
        appliesWhen: record.appliesWhen,
        orderRequirement: record.orderRequirement,
      }
    : { status: record.status, label: record.requestLabelAtConfirmation };
}
export function confirmProcedure(
  target: ProcedureTarget,
  previous: LocalProcedure | undefined,
  draft: ProcedureContent | null,
  by: string,
  at = new Date().toISOString(),
): LocalProcedure {
  if (target.conflict || !target.id || (previous && previous.requestId !== target.id))
    throw new Error("Resolve the request identity before saving its procedure.");
  const base = {
    id: previous?.id ?? crypto.randomUUID(),
    requestId: target.id,
    requestLabelAtConfirmation: target.label,
    version: (previous?.version ?? 0) + 1,
    confirmedBy: by,
    confirmedAt: at,
  };
  const next: LocalProcedure = draft
    ? { ...base, status: "configured", ...structuredClone(draft) }
    : { ...base, status: "no_specific_procedure" };
  validateLocalProcedures({ [target.id]: next });
  if (previous && JSON.stringify(content(previous)) === JSON.stringify(content(next)))
    return previous;
  if (previous) {
    const { history, ...revision } = previous;
    next.history = [...(history ?? []), structuredClone(revision)];
  }
  return next;
}
/** Only visible, unchecked and still-unreviewed requests receive explicit negative confirmations. */
export function confirmVisibleWithoutProcedures(
  p: PracticeData,
  visibleIds: string[],
  selectedIds: string[],
  by: string,
): LocalProcedure[] {
  return procedureTargets(p)
    .filter(
      (t) =>
        visibleIds.includes(t.id) &&
        !selectedIds.includes(t.id) &&
        !t.conflict &&
        !p.localProcedures?.[t.id],
    )
    .map((t) => confirmProcedure(t, undefined, null, by));
}
