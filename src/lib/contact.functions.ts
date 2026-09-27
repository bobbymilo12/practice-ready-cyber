import { createServerFn } from "@tanstack/react-start";
import { contactSchema, persistContact } from "./contact";

async function notifyContactByEmail(data: {
  name: string;
  email: string;
  practice?: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM ?? process.env.INVITE_FROM;
  const recipient = process.env.CONTACT_TO;
  if (!apiKey && !from && !recipient) return;
  if (!apiKey || !from || !recipient) {
    throw new Error("Contact email configuration is incomplete.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      reply_to: data.email,
      subject: `PracticeReady contact enquiry from ${data.name}`,
      text: [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        data.practice ? `GP practice: ${data.practice}` : "",
        "",
        data.message,
      ]
        .filter(Boolean)
        .join("\n"),
    }),
  });
  if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}.`);
}

export const submitContact = createServerFn({ method: "POST" })
  .validator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    // Reuse the existing insert-only public contact table and Supabase connection.
    const { supabase } = await import("@/integrations/supabase/client");
    const result = await persistContact(data, supabase);
    try {
      await notifyContactByEmail(data);
    } catch (error) {
      console.error("Contact message saved, but email notification failed.", error);
    }
    return result;
  });
