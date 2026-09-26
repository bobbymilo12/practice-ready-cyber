import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  message: z.string().trim().min(1, "Enter a message.").max(2000),
});

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((data) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    // The public form can only insert; its row-level policy permits no reads.
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.from("contact_messages").insert(data);
    if (error) throw new Error("Your message could not be sent. Please try again.");
    return { success: true };
  });