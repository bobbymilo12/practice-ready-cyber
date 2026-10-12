import { createFileRoute } from "@tanstack/react-router";
import { handleContactRequest } from "@/lib/contact-handler";

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: ({ request }) => handleContactRequest(request),
    },
  },
});
