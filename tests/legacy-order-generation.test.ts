import * as questionQuality from "../src/lib/question-quality.ts";
import * as changeTracking from "../src/lib/practice-change-tracking.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as config from "../src/lib/module-config.ts";
import { practiceScenarios } from "../src/lib/practice-scenarios.ts";
import { empty } from "./fixtures/role-matching.ts";

test("actual custom draft generation retains MCQs for ordering/mixed preferences, never synthesising steps", () => {
  // Execute the existing store using Node-resolved imports; no browser or new test dependency.
  const source = readFileSync(new URL("../src/lib/store.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = createRequire(import.meta.url);
  const exports: Record<string, any> = {};
  new Function("require", "exports", js)(
    (id: string) =>
      id === "./practice-change-tracking"
        ? changeTracking
        : id === "./module-config"
          ? config
          : id === "./practice-scenarios"
            ? { practiceScenarios }
            : id === "./question-quality"
              ? questionQuality
              : require(id),
    exports,
  );
  exports.useApp.setState({ practiceData: empty(), answers: {} });
  for (const format of ["mcq", "order", "mixed"]) {
    const scenarios = exports.draftsForTopic("custom", format, "Test", "easy", "short", {
      example: "Requests go through the example form.",
    });
    assert.ok(scenarios.length > 0);
    assert.ok(scenarios.every((s: any) => s.kind === "mcq"));
    assert.ok(scenarios.every((s: any) => !("steps" in s)));
  }
});
