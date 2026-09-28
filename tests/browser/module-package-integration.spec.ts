import { test, expect } from "@playwright/test";
import { useApp, defaultPracticeData } from "../../src/lib/store";
import { defaultModuleSettings, generateConfiguredModule } from "../../src/lib/module-config";
import { startSession } from "../../src/lib/training";

test("configured induction starters preserve packages, assignments and review gates", () => {
  useApp.setState({
    modules: [],
    packages: [],
    assignments: [],
    practiceData: structuredClone(defaultPracticeData),
  });
  const ids = useApp.getState().completeSetup(true);
  expect(ids).toHaveLength(6);
  const initial = useApp.getState();
  const pkg = initial.packages[0];
  expect(pkg.moduleIds).toEqual(ids);
  expect(initial.modules.every((m) => m.packageId === pkg.id)).toBe(true);
  expect(initial.modules.filter((m) => m.settings)).toHaveLength(5);
  expect(initial.modules.find((m) => m.topicKey === "custom")?.settings).toBeUndefined();
  expect(initial.completeSetup(true)).toEqual([]);
  expect(useApp.getState().packages).toHaveLength(1);
  const module = initial.modules.find((m) => m.topicKey === "appointment-booking")!;
  for (const s of module.scenarios) useApp.getState().approveScenario(module.id, s.id);
  useApp.getState().publishModule(module.id);
  useApp.getState().assignModule("trainee", module.id);
  const assignment = useApp.getState().assignments[0];
  const published = useApp.getState().modules.find((m) => m.id === module.id)!;
  const session = startSession(published, assignment, "attempt");
  const settings = { ...defaultModuleSettings(), count: 1 };
  useApp
    .getState()
    .configureModule(
      module.id,
      settings,
      generateConfiguredModule(module.topicKey, module.type, initial.practiceData, settings),
    );
  const edited = useApp.getState().modules.find((m) => m.id === module.id)!;
  expect(edited.packageId).toBe(pkg.id);
  expect(useApp.getState().assignments).toEqual([assignment]);
  expect(session.scenarios).toEqual(published.scenarios);
  expect(() => startSession(edited, assignment, "blocked")).toThrow(/review/);
  useApp.getState().removeDraftModule(module.id);
  expect(useApp.getState().modules.some((m) => m.id === module.id)).toBe(true);
  const draftId = ids.find((id) => id !== module.id)!;
  useApp.getState().removeDraftModule(draftId);
  expect(useApp.getState().packages[0].moduleIds).not.toContain(draftId);
});

test("development invitation retains package assignments across reload", async ({ page }) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Continue as Manager", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();
  await page.goto("/trainees/invite");
  await page.getByLabel("Trainee work email").fill("package@example.test");
  await page.getByLabel("Name", { exact: true }).fill("Package Starter");
  await page.getByRole("button", { name: "Invite employee" }).click();
  await expect(page.getByText("Mock trainee added", { exact: true })).toBeVisible();
  await page.reload();
  const assigned = await page.evaluate(() => {
    const w = JSON.parse(sessionStorage.getItem("practiceready-dev-workspace-v1")!);
    const trainee = w.trainees.find((t: { email: string }) => t.email === "package@example.test");
    return w.state.assignments.filter((a: { traineeId: string }) => a.traineeId === trainee.id);
  });
  expect(assigned.map((a: { moduleId: string }) => a.moduleId).sort()).toEqual([
    "dev-module-0",
    "dev-module-1",
  ]);
  expect(assigned.every((a: { packageId: string }) => a.packageId === "dev-induction")).toBe(true);
});
