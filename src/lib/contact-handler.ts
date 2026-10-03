import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { contactSchema, persistContact } from "./contact";

async function notifyContactByEmail(data: {
  name: string;
  email: string;
  practice?: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM ?? process.env.INVITE_FROM;
  const recipient = process.env.CONTACT_TO ?? "practicereadyuk@gmail.com";
  if (!apiKey && !from && !recipient) return;
  if (!apiKey || !from || !recipient) {
    throw new Error("Contact email configuration is incomplete.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
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

function createContactDatabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secretKeys = process.env.SUPABASE_SECRET_KEYS;
  let configuredSecretKey: string | undefined;
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as { default?: unknown };
      if (typeof parsed.default === "string") configuredSecretKey = parsed.default;
    } catch {
      throw new Error("SUPABASE_SECRET_KEYS must be valid JSON.");
    }
  }
  const key =
    configuredSecretKey ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Contact form requires SUPABASE_URL and SUPABASE_SECRET_KEYS (or SUPABASE_SECRET_KEY, the legacy SUPABASE_SERVICE_ROLE_KEY, or the public VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY pair).",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
    await notifyContactByEmail(parsed.data);
  } catch (error) {
    console.error("Contact email could not be sent.", error);
    return Response.json(
      { error: "Your message could not be sent. Please try again." },
      { status: 502 },
    );
  }

  try {
    const database = createContactDatabase();
    await persistContact(parsed.data, database);
  } catch (error) {
    // Email delivery is the primary contact workflow. Database storage is
    // retained when configured but must not make a successfully sent message fail.
    console.error("Contact email sent, but database storage failed.", error);
  }

  return Response.json({ success: true as const });
}
