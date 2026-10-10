import { createServerFn } from "@tanstack/react-start";
import { consentSchema, pageViewSchema, persistConsent, persistPageView } from "./cookie-data";

export const recordConsent = createServerFn({ method: "POST" })
  .validator((data: unknown) => consentSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return persistConsent(data, supabaseAdmin);
  });

export const recordPageView = createServerFn({ method: "POST" })
  .validator((data: unknown) => pageViewSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return persistPageView(data, supabaseAdmin);
  });
