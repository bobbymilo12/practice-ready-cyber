import assert from "node:assert/strict";
import test from "node:test";
import { persistContact } from "../src/lib/contact.ts";

test("contact submits a validated row to the existing table and retains optional practice", async () => {
  const rows: unknown[] = [];
  const database = {
    from(table: string) {
      assert.equal(table, "contact_messages");
      return {
        async insert(row: unknown) {
          rows.push(row);
          return { error: null };
        },
      };
    },
  };
  assert.deepEqual(
    await persistContact(
      {
        name: " Alex ",
        email: " alex@example.test ",
        practice: " Oak Practice ",
        message: " Hello ",
      },
      database,
    ),
    { success: true },
  );
  assert.deepEqual(rows, [
    { name: "Alex", email: "alex@example.test", message: "GP practice: Oak Practice\n\nHello" },
  ]);
  await persistContact({ name: "Alex", email: "alex@example.test", message: "Hello" }, database);
  assert.deepEqual(rows[1], { name: "Alex", email: "alex@example.test", message: "Hello" });
});
test("invalid submissions and honeypot entries never reach the database", async () => {
  const database = {
    from() {
      throw new Error("Must not write");
    },
  };
  const valid = { name: "Alex", email: "alex@example.test", message: "Hello" };
  for (const patch of [
    { name: " " },
    { email: "invalid" },
    { message: " " },
    { practice: "x".repeat(121) },
    { website: "spam" },
    { message: "x".repeat(2000), practice: "Oak" },
  ]) {
    await assert.rejects(
      persistContact({ ...valid, ...patch }, database),
      (error: Error) => error.message !== "Must not write",
    );
  }
});
test("database failures never return success or expose backend details", async () => {
  const database = {
    from() {
      return {
        async insert() {
          return { error: { message: "private database details" } };
        },
      };
    },
  };
  await assert.rejects(
    persistContact({ name: "Alex", email: "alex@example.test", message: "Hello" }, database),
    /Your message could not be sent/,
  );
});

test("the Supabase transport posts to the existing contact_messages REST endpoint", async () => {
  const { createClient } = await import("@supabase/supabase-js");
  let requestCount = 0;
  const database = createClient("https://contact.example.test", "test-public-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        requestCount++;
        assert.equal(String(input), "https://contact.example.test/rest/v1/contact_messages");
        assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(String(init?.body)), {
          name: "Alex",
          email: "alex@example.test",
          message: "GP practice: Oak\n\nPilot enquiry",
        });
        return new Response(null, { status: 201 });
      },
    },
  });
  await persistContact(
    { name: "Alex", email: "alex@example.test", practice: "Oak", message: "Pilot enquiry" },
    database,
  );
  assert.equal(requestCount, 1);
});
