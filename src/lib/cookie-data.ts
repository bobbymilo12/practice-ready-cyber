import { z } from "zod";

// Bump when the cookie policy changes what is collected, so stored consents show which text was agreed to.
export const COOKIE_POLICY_VERSION = "2026-10-10";

export const consentSchema = z.object({
  visitorId: z.string().uuid().nullable(),
  choice: z.enum(["accepted", "rejected"]),
});
export const pageViewSchema = z.object({
  visitorId: z.string().uuid(),
  // Path only: query strings and hashes can carry tokens or personal data.
  path: z.string().startsWith("/").max(300),
  referrerHost: z.string().max(255).nullable(),
});

interface CookieDatabase {
  from(table: "cookie_consents" | "page_views"): {
    insert(row: Record<string, unknown>): PromiseLike<{ error: unknown }>;
  };
}

export async function persistConsent(input: unknown, database: CookieDatabase) {
  const data = consentSchema.parse(input);
  const { error } = await database.from("cookie_consents").insert({
    visitor_id: data.visitorId,
    choice: data.choice,
    policy_version: COOKIE_POLICY_VERSION,
  });
  if (error) throw new Error("Could not record cookie choice.");
  return { success: true as const };
}

export async function persistPageView(input: unknown, database: CookieDatabase) {
  const data = pageViewSchema.parse(input);
  const { error } = await database.from("page_views").insert({
    visitor_id: data.visitorId,
    path: data.path.split(/[?#]/)[0],
    referrer_host: data.referrerHost,
  });
  if (error) throw new Error("Could not record page view.");
  return { success: true as const };
}
