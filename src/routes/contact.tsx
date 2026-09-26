import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitContact } from "@/lib/contact.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [
    { title: "Contact Us — PracticeReady" },
    { name: "description", content: "Contact the PracticeReady team with your questions or message." },
    { property: "og:title", content: "Contact Us — PracticeReady" },
    { property: "og:description", content: "Send a message to the PracticeReady team." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setError("Please complete all fields.");
      return;
    }
    setError("");
    setStatus("sending");
    try {
      await submitContact({ data: { name: trimmedName, email: trimmedEmail, message: trimmedMessage } });
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch (cause) {
      setStatus("idle");
      setError(cause instanceof Error ? cause.message : "Your message could not be sent. Please try again.");
    }
  }

  return <Shell>
    <section className="mx-auto max-w-2xl pb-10 pt-2 sm:pb-14 lg:pt-6">
      <p className="mb-6 inline-flex rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase text-secondary-foreground">Contact PracticeReady</p>
      <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">Contact Us</h1>
      <p className="mt-5 text-lg leading-8 text-muted-foreground">Have a question or want to get in touch? Send us a message.</p>
      {status === "sent" ? <div role="status" className="mt-10 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl font-semibold">Thank you for your message.</h2>
        <p className="mt-2 text-muted-foreground">Your message has been received.</p>
        <Button className="mt-6" variant="outline" onClick={() => setStatus("idle")}>Send another message</Button>
      </div> : <form onSubmit={onSubmit} className="mt-10 space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-2"><label htmlFor="contact-name" className="text-sm font-medium">Name</label><Input id="contact-name" type="text" autoComplete="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="h-11" /></div>
        <div className="space-y-2"><label htmlFor="contact-email" className="text-sm font-medium">Email</label><Input id="contact-email" type="email" autoComplete="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" /></div>
        <div className="space-y-2"><label htmlFor="contact-message" className="text-sm font-medium">Message</label><Textarea id="contact-message" required maxLength={2000} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className="resize-y" /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={status === "sending"} className="h-11 px-6">{status === "sending" ? "Sending…" : "Send message"}{status !== "sending" && <ArrowRight aria-hidden="true" />}</Button>
      </form>}
    </section>
  </Shell>;
}