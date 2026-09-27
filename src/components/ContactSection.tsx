import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitContact } from "@/lib/contact.functions";

export function ContactSection() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const data = {
      name: value("name"),
      email: value("email"),
      practice: value("practice"),
      message: value("message"),
      website: value("website"),
    };
    if (!data.name || !data.message) {
      setError("Please enter your name and message.");
      return;
    }
    setError("");
    setStatus("sending");
    try {
      const result = await submitContact({ data });
      if (!result?.success) throw new Error("Submission failed");
      setStatus("sent");
    } catch {
      setStatus("idle");
      setError("Your message could not be sent. Please try again. Your entries have been kept.");
    }
  }
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="marketing-contact marketing-section"
    >
      <div className="marketing-wrap marketing-contact-grid">
        <div>
          <p className="marketing-eyebrow">Contact Us</p>
          <h1
            id="contact-heading"
            className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl"
          >
            Interested in PracticeReady?
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            We're currently speaking with GP practices and primary care teams as we develop
            PracticeReady. If you'd like to learn more, share feedback or discuss trying it with
            your team, we'd love to hear from you.
          </p>
          <p id="contact-privacy" className="mt-8 text-sm leading-6 text-muted-foreground">
            Please don't include patient information in your message.
          </p>
        </div>
        {status === "sent" ? (
          <div role="status" className="marketing-form">
            <h3 className="font-display text-2xl font-semibold">Thank you for your message.</h3>
            <p className="mt-3 leading-7 text-muted-foreground">
              Your message has been received by PracticeReady.
            </p>
            <Button className="mt-6" variant="outline" onClick={() => setStatus("idle")}>
              Send another message
            </Button>
          </div>
        ) : (
          <form
            method="post"
            onSubmit={send}
            className="marketing-form"
            aria-label="Contact PracticeReady"
            aria-describedby="contact-privacy"
            aria-busy={status === "sending"}
          >
            <fieldset disabled={!ready || status === "sending"} className="min-w-0 space-y-4">
              <div className="space-y-2">
                <label htmlFor="contact-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="contact-name"
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={255}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-practice" className="text-sm font-medium">
                  GP practice (optional)
                </label>
                <Input
                  id="contact-practice"
                  name="practice"
                  autoComplete="organization"
                  maxLength={120}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-message" className="text-sm font-medium">
                  Message
                </label>
                <Textarea
                  id="contact-message"
                  name="message"
                  required
                  maxLength={1800}
                  rows={4}
                  className="resize-y"
                />
              </div>
              <div className="marketing-honeypot" aria-hidden="true">
                <label htmlFor="contact-website">Leave this field blank</label>
                <input
                  id="contact-website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  maxLength={200}
                />
              </div>
              <Button type="submit" className="h-11 px-6">
                {status === "sending" ? "Sending…" : "Send message"}
              </Button>
            </fieldset>
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
