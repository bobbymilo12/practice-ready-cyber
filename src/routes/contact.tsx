import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { ContactSection } from "@/components/ContactSection";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — PracticeReady" },
      {
        name: "description",
        content:
          "Get in touch about PracticeReady, share feedback or discuss trying it with your primary care team.",
      },
    ],
  }),
  component: () => (
    <MarketingShell>
      <ContactSection />
    </MarketingShell>
  ),
});
