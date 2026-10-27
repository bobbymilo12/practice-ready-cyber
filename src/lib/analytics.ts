// Shape returned by the practice-api "analytics" action, and the pure aggregation the page charts.

export interface AnalyticsData {
  practices?: { id: string; name: string }[];
  staff: {
    id: string;
    name: string;
    role: "manager" | "trainee";
    jobRole?: string;
    inactiveAt?: string;
  }[];
  logins: { userId: string; at: number }[];
  modules: { id: string; title: string }[];
  assignments: {
    id: string;
    traineeId: string;
    moduleId: string;
    assignedAt: number;
    dueDate?: string;
    withdrawnAt?: number;
  }[];
  attempts: {
    traineeId?: string;
    assignmentId: string;
    moduleId: string;
    startedAt?: number;
    completedAt?: number;
    correct?: number;
    total?: number;
    supersededAt?: number;
  }[];
}

export type AssignmentStatus = "completed" | "in_progress" | "not_started" | "overdue";
type Attempt = AnalyticsData["attempts"][number];

const DAY = 86400000;

/** Monday (UTC) of the week containing `ms`, as YYYY-MM-DD. */
export function weekOf(ms: number) {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Counts per week for the last `weeks` weeks (oldest first), zero-filled. */
export function weeklyCounts(times: number[], now: number, weeks = 12) {
  const keys = Array.from({ length: weeks }, (_, i) => weekOf(now - (weeks - 1 - i) * 7 * DAY));
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const t of times) {
    const k = weekOf(t);
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  return keys.map((week) => ({ week, count: counts.get(week)! }));
}

export function attemptMinutes(a: Attempt) {
  return a.startedAt && a.completedAt && a.completedAt >= a.startedAt
    ? (a.completedAt - a.startedAt) / 60000
    : undefined;
}

export function median(values: number[]) {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;

export function assignmentStatus(
  assignment: AnalyticsData["assignments"][number],
  attempts: Attempt[],
  now: number,
): AssignmentStatus {
  const mine = attempts.filter((a) => a.assignmentId === assignment.id);
  if (mine.some((a) => a.completedAt)) return "completed";
  if (assignment.dueDate && assignment.dueDate < new Date(now).toISOString().slice(0, 10))
    return "overdue";
  // An attempt replaced by a newer one does not count as current progress.
  return mine.some((a) => !a.supersededAt) ? "in_progress" : "not_started";
}

export function summarise(data: AnalyticsData, now = Date.now()) {
  const assignments = data.assignments.filter((a) => !a.withdrawnAt);
  const completed = data.attempts.filter((a) => a.completedAt);
  const status = new Map(assignments.map((a) => [a.id, assignmentStatus(a, data.attempts, now)]));
  const active = data.staff.filter((s) => !s.inactiveAt);
  const lastLogin = new Map<string, number>();
  for (const l of data.logins)
    lastLogin.set(l.userId, Math.max(lastLogin.get(l.userId) ?? 0, l.at));

  const moduleTitle = new Map(data.modules.map((m) => [m.id, m.title]));
  const moduleIds = [...new Set(assignments.map((a) => a.moduleId))];
  const moduleStatus = moduleIds.map((id) => {
    const row = {
      module: moduleTitle.get(id) ?? "Removed module",
      completed: 0,
      in_progress: 0,
      not_started: 0,
      overdue: 0,
    };
    for (const a of assignments) if (a.moduleId === id) row[status.get(a.id)!]++;
    return row;
  });
  const moduleDuration = moduleIds
    .map((id) => ({
      module: moduleTitle.get(id) ?? "Removed module",
      minutes: median(
        completed.filter((a) => a.moduleId === id).flatMap((a) => attemptMinutes(a) ?? []),
      ),
    }))
    .filter((m) => m.minutes !== undefined);

  const staffRows = data.staff.map((s) => {
    const mine = assignments.filter((a) => a.traineeId === s.id);
    const done = completed.filter((a) => a.traineeId === s.id);
    const last = lastLogin.get(s.id);
    return {
      ...s,
      lastLogin: last,
      logins30: data.logins.filter((l) => l.userId === s.id && l.at > now - 30 * DAY).length,
      assigned: mine.length,
      started: mine.filter((a) => status.get(a.id) !== "not_started").length,
      completed: mine.filter((a) => status.get(a.id) === "completed").length,
      overdue: mine.filter((a) => status.get(a.id) === "overdue").length,
      avgScore: average(done.filter((a) => a.total).map((a) => (100 * a.correct!) / a.total!)),
      avgMinutes: average(done.flatMap((a) => attemptMinutes(a) ?? [])),
      dormant: !s.inactiveAt && (!last || last < now - 30 * DAY),
    };
  });

  return {
    kpis: {
      activeStaff: active.length,
      loggedIn7: active.filter((s) => (lastLogin.get(s.id) ?? 0) > now - 7 * DAY).length,
      completed30: completed.filter((a) => a.completedAt! > now - 30 * DAY).length,
      overdue: [...status.values()].filter((s) => s === "overdue").length,
      medianMinutes: median(completed.flatMap((a) => attemptMinutes(a) ?? [])),
    },
    loginsByWeek: weeklyCounts(
      data.logins.map((l) => l.at),
      now,
    ),
    completionsByWeek: weeklyCounts(
      completed.map((a) => a.completedAt!),
      now,
    ),
    moduleStatus,
    moduleDuration,
    staffRows,
  };
}

export interface OverviewInput {
  practices: { id: string; name: string }[];
  people: {
    practiceId: string;
    role: string;
    email: string;
    inactiveAt?: string;
    platformAdmin?: boolean;
  }[];
  logins: { practiceId: string; at: number }[];
  completions: { practiceId: string; at: number }[];
}
export type PracticeOverview = ReturnType<typeof practiceOverview>;

/** One row per practice for the platform admin page. */
export function practiceOverview(input: OverviewInput, now = Date.now()) {
  // Each admin sign-up provisions an empty practice; hide those.
  const adminOnly = (id: string) => {
    const people = input.people.filter((p) => p.practiceId === id);
    return people.length > 0 && people.every((p) => p.platformAdmin);
  };
  const rows = input.practices
    .filter((p) => !adminOnly(p.id))
    .map((p) => {
      const people = input.people.filter((x) => x.practiceId === p.id);
      const logins = input.logins.filter((l) => l.practiceId === p.id).map((l) => l.at);
      const done = input.completions.filter((c) => c.practiceId === p.id).map((c) => c.at);
      return {
        id: p.id,
        name: p.name,
        managers: people.filter((x) => x.role === "manager").map((x) => x.email),
        activeStaff: people.filter((x) => x.role === "trainee" && !x.inactiveAt).length,
        lastLogin: logins.length ? Math.max(...logins) : undefined,
        logins30: logins.filter((t) => t >= now - 30 * DAY).length,
        completed30: done.filter((t) => t >= now - 30 * DAY).length,
        completedTotal: done.length,
      };
    })
    .sort((a, b) => (b.lastLogin ?? 0) - (a.lastLogin ?? 0));
  const ids = new Set(rows.map((r) => r.id));
  return {
    totals: {
      practices: rows.length,
      activeStaff: rows.reduce((n, r) => n + r.activeStaff, 0),
      logins7: input.logins.filter((l) => ids.has(l.practiceId) && l.at >= now - 7 * DAY).length,
      completed30: rows.reduce((n, r) => n + r.completed30, 0),
    },
    practices: rows,
  };
}
