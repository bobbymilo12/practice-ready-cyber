import { createServerFn } from "@tanstack/react-start";
import { contactSchema, persistContact } from "./contact";

export const submitContact = createServerFn({ method: "POST" })
  .validator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    // Reuse the existing insert-only public contact table and Supabase connection.
    const { supabase } = await import("@/integrations/supabase/client");
    return persistContact(data, supabase);
  });
