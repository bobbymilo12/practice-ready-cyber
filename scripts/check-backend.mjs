import { readFile } from "node:fs/promises";

// Only public configuration is read. Never print keys or provider payloads.
const local = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() => "");
const values = Object.fromEntries(
  local
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
const url = process.env.VITE_SUPABASE_URL || values.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || values.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Set the two public Supabase variables first.");
let ready = true;
for (const [label, path, options, expected] of [
  ["Supabase public auth configuration", "/auth/v1/settings", {}, [200]],
  [
    "Application tables reject anonymous access",
    "/rest/v1/practices?select=id&limit=0",
    {},
    [401, 403],
  ],
  [
    "Practice API rejects unauthenticated requests",
    "/functions/v1/practice-api",
    { method: "POST", body: JSON.stringify({ action: "load" }) },
    [401],
  ],
]) {
  try {
    const response = await fetch(`${url}${path}`, {
      ...options,
      headers: { apikey: key, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const ok = expected.includes(response.status);
    console.log(`${ok ? "PASS" : "NOT READY"}: ${label} (HTTP ${response.status})`);
    ready &&= ok;
  } catch {
    console.log(`NOT READY: ${label} (network request failed)`);
    ready = false;
  }
}
if (!ready) process.exitCode = 1;
