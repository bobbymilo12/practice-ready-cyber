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

export async function handleContactRequest(request: Request): Promise<Response> {
  const input: unknown = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return Response.json(
      { error: "Please check your contact details and message." },
      { status: 400 },
    );
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await persistContact(parsed.data, supabaseAdmin);
    try {
      await notifyContactByEmail(parsed.data);
    } catch (error) {
      console.error("Contact message saved, but email notification failed.", error);
    }
    return Response.json(result);
  } catch (error) {
    console.error("Contact message could not be saved.", error);
    return Response.json(
      { error: "Your message could not be sent. Please try again." },
      { status: 500 },
    );
  }
}
