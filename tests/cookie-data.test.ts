import assert from "node:assert/strict";
import test from "node:test";
import { COOKIE_POLICY_VERSION, persistConsent, persistPageView } from "../src/lib/cookie-data.ts";

function fakeDatabase(rows: unknown[]) {
  return {
    from(table: string) {
      return {
        async insert(row: unknown) {
          rows.push({ table, ...(row as object) });
          return { error: null };
        },
      };
    },
  };
}
const id = "0b7c3f4e-1d2a-4c5b-9e8f-7a6b5c4d3e2f";

test("consent choices are stored with the policy version", async () => {
  const rows: unknown[] = [];
  await persistConsent({ visitorId: null, choice: "rejected" }, fakeDatabase(rows));
  assert.deepEqual(rows, [
    {
      table: "cookie_consents",
      visitor_id: null,
      choice: "rejected",
      policy_version: COOKIE_POLICY_VERSION,
    },
  ]);
  await assert.rejects(persistConsent({ visitorId: null, choice: "maybe" }, fakeDatabase(rows)));
});

test("page views store only path, referrer host and random id", async () => {
  const rows: unknown[] = [];
  await persistPageView(
    { visitorId: id, path: "/data-hub", referrerHost: "google.com" },
    fakeDatabase(rows),
  );
  assert.deepEqual(rows, [
    { table: "page_views", visitor_id: id, path: "/data-hub", referrer_host: "google.com" },
  ]);
  await assert.rejects(
    persistPageView({ visitorId: "not-a-uuid", path: "/", referrerHost: null }, fakeDatabase(rows)),
  );
  await assert.rejects(
    persistPageView(
      { visitorId: id, path: "https://evil.test", referrerHost: null },
      fakeDatabase(rows),
    ),
  );
});
