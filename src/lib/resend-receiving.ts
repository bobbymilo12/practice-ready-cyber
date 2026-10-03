import { Resend } from "resend";

type ReceivedEvent = {
  type?: string;
  data?: {
    email_id?: string;
  };
};

export async function handleResendReceiving(request: Request): Promise<Response> {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const from = process.env.CONTACT_FROM ?? process.env.INVITE_FROM;
  const to = process.env.CONTACT_TO;

  if (!apiKey || !webhookSecret || !from || !to) {
    console.error(
      "Resend receiving is not configured. Set RESEND_API_KEY, RESEND_WEBHOOK_SECRET, CONTACT_FROM, and CONTACT_TO.",
    );
    return Response.json({ error: "Receiving is not configured." }, { status: 500 });
  }

  const payload = await request.text();
  let event: ReceivedEvent;
  try {
    const resend = new Resend(apiKey);
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    }) as ReceivedEvent;
  } catch {
    return Response.json({ error: "Invalid webhook." }, { status: 400 });
  }

  if (event.type !== "email.received") return Response.json({ received: true });

  const emailId = event.data?.email_id;
  if (!emailId) return Response.json({ error: "Invalid received email event." }, { status: 400 });

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.receiving.forward({
    emailId,
    from,
    to,
  });
  if (error) {
    console.error("Resend could not forward a received email.", error);
    return Response.json({ error: "Could not forward received email." }, { status: 502 });
  }

  return Response.json(data);
}
