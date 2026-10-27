import assert from "node:assert/strict";
import test from "node:test";
import { assignmentStatus, summarise, weekOf, weeklyCounts } from "../src/lib/analytics.ts";
import type { AnalyticsData } from "../src/lib/analytics.ts";

const now = Date.parse("2026-10-28T12:00:00Z"); // a Wednesday
const day = 86400000;

test("weeks start on Monday and are zero-filled", () => {
  assert.equal(weekOf(now), "2026-10-26");
  assert.equal(weekOf(Date.parse("2026-10-25T23:00:00Z")), "2026-10-19");
  const weeks = weeklyCounts([now, now - day, now - 7 * day, now - 400 * day], now, 3);
  assert.deepEqual(weeks, [
    { week: "2026-10-12", count: 0 },
    { week: "2026-10-19", count: 1 },
    { week: "2026-10-26", count: 2 },
  ]);
});

test("assignment status: completed beats overdue, superseded attempts are not progress", () => {
  const a = { id: "a", traineeId: "t", moduleId: "m", assignedAt: 0, dueDate: "2026-10-01" };
  const base = { assignmentId: "a", moduleId: "m" };
  assert.equal(assignmentStatus(a, [{ ...base, completedAt: now }], now), "completed");
  assert.equal(assignmentStatus(a, [], now), "overdue");
  const notDue = { ...a, dueDate: undefined };
  assert.equal(assignmentStatus(notDue, [{ ...base, supersededAt: 1 }], now), "not_started");
  assert.equal(assignmentStatus(notDue, [{ ...base, startedAt: 1 }], now), "in_progress");
});

test("summary skips durations without startedAt and flags dormant staff", () => {
  const data: AnalyticsData = {
    staff: [
      { id: "t", name: "Jamie", role: "trainee" },
      { id: "u", name: "Sam", role: "trainee" },
      { id: "x", name: "Gone", role: "trainee", inactiveAt: "2026-01-01" },
    ],
    logins: [{ userId: "t", at: now - day }],
    modules: [{ id: "m", title: "Bookings" }],
    assignments: [
      { id: "a", traineeId: "t", moduleId: "m", assignedAt: 0 },
      { id: "b", traineeId: "u", moduleId: "m", assignedAt: 0 },
      { id: "w", traineeId: "u", moduleId: "m", assignedAt: 0, withdrawnAt: 1 },
    ],
    attempts: [
      {
        traineeId: "t",
        assignmentId: "a",
        moduleId: "m",
        startedAt: now - 20 * 60000,
        completedAt: now,
        correct: 3,
        total: 4,
      },
      { traineeId: "u", assignmentId: "b", moduleId: "m", completedAt: now, correct: 1, total: 2 },
    ],
  };
  const s = summarise(data, now);
  assert.equal(s.kpis.activeStaff, 2);
  assert.equal(s.kpis.loggedIn7, 1);
  assert.equal(s.kpis.completed30, 2);
  assert.equal(s.kpis.medianMinutes, 20);
  assert.deepEqual(s.moduleStatus, [
    { module: "Bookings", completed: 2, in_progress: 0, not_started: 0, overdue: 0 },
  ]);
  const [jamie, sam, gone] = s.staffRows;
  assert.equal(jamie.avgScore, 75);
  assert.equal(jamie.avgMinutes, 20);
  assert.equal(jamie.dormant, false);
  assert.equal(sam.avgMinutes, undefined);
  assert.equal(sam.assigned, 1);
  assert.equal(sam.dormant, true);
  assert.equal(gone.dormant, false);
});
