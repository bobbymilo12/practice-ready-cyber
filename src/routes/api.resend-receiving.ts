import { createFileRoute } from "@tanstack/react-router";
import { handleResendReceiving } from "@/lib/resend-receiving";

export const Route = createFileRoute("/api/resend-receiving")({
  server: {
    handlers: {
      POST: ({ request }) => handleResendReceiving(request),
    },
  },
});
