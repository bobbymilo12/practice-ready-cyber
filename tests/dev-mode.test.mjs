import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual helper with the same compile-time DEV constant Vite supplies.
function mode(development, hostname) {
  const source = readFileSync(
    new URL("../src/lib/dev-mode.ts", import.meta.url),
    "utf8",
  ).replaceAll("import.meta.env.DEV", String(development));
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const storage = new Map([["practiceready-dev-role-v1", "manager"]]);
  const exports = {};
  const navigations = [];
  vm.runInNewContext(code, {
    exports,
    window: { location: { hostname, assign: (url) => navigations.push(url) } },
    sessionStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  });
  return { ...exports, navigations };
}

test("production ignores stored mock roles and rejects entry even on localhost", () => {
  const auth = mode(false, "localhost");
  assert.equal(auth.devAuthAvailable(), false);
  assert.equal(auth.devRole(), null);
  assert.throws(() => auth.enterDevSession("manager"), /only available locally/);
  assert.deepEqual(auth.navigations, []);
});
test("hosted development cannot use mock authentication", () => {
  for (const host of ["preview.example.test", "localhost.example.test", "192.168.1.2"]) {
    const auth = mode(true, host);
    assert.equal(auth.devRole(), null);
    assert.throws(() => auth.enterDevSession("trainee"));
  }
});
test("loopback development supports both roles and clears the marker on logout", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    const auth = mode(true, host);
    assert.equal(auth.devRole(), "manager");
    auth.enterDevSession("trainee");
    assert.equal(auth.devRole(), "trainee");
    auth.leaveDevSession();
    assert.equal(auth.devRole(), null);
    assert.deepEqual(auth.navigations, ["/staff", "/auth"]);
  }
});
