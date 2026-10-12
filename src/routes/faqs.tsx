import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HelpCircle } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: "FAQs — PracticeReady" },
      {
        name: "description",
        content:
          "Answers to common questions about PracticeReady: how the training works, how it is tailored to your GP practice, and what managers can create and track.",
      },
      { property: "og:title", content: "PracticeReady FAQs" },
      {
        property: "og:description",
        content:
          "How PracticeReady helps GP reception and admin teams learn their practice's own procedures.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqsPage,
});

const FAQS: [string, string][] = [
  [
    "What is PracticeReady?",
    "PracticeReady is a practical onboarding and training platform for GP reception and administrative teams. Staff learn through realistic scenarios designed to help them apply knowledge to situations they may encounter in their day-to-day role.",
  ],
  [
    "Can PracticeReady be tailored to our GP practice?",
    "Yes. PracticeReady is designed to adapt training to the individual practice, allowing staff to learn not only general best practice but also the processes, procedures and ways of working specific to their workplace.",
  ],
  [
    "Can managers create their own training?",
    "Yes. Managers can create custom modules and training packages around their practice’s own procedures and requirements, alongside PracticeReady’s core training content.",
  ],
  [
    "Can different staff receive different training?",
    "Yes. Managers can assign training based on an employee’s role and responsibilities, creating more relevant onboarding pathways rather than giving every member of staff the same training.",
  ],
  [
    "Does PracticeReady replace our existing mandatory training?",
    "No. PracticeReady is designed to complement mandatory and compliance training by focusing on practical onboarding and applying knowledge to real workplace situations.",
  ],
  [
    "How does the training work?",
    "Employees work through structured modules and realistic scenarios where they have to make decisions and apply what they’ve learned, helping them build confidence before dealing with similar situations independently.",
  ],
  [
    "Can managers track employee progress?",
    "Yes. The performance dashboard allows managers to monitor assigned training, progress and results, making it easier to identify where employees are doing well and where additional support may be needed.",
  ],
  [
    "Can we use PracticeReady across multiple practices?",
    "PracticeReady is being designed to support both individual GP practices and organisations managing training across multiple practices, while still allowing training to be tailored at practice level.",
  ],
  [
    "How do we get started?",
    "PracticeReady is currently being developed and tested with primary care teams. Get in touch if you’re interested in learning more, seeing the platform or discussing a pilot.",
  ],
];

function FaqsPage() {
  const account = useApp((s) => s.account);
  return (
    <MarketingShell>
      <div className="marketing-wrap marketing-page marketing-faq-page">
        <section className="pb-12 pt-2 lg:pt-6">
          <p className="marketing-eyebrow mb-6 inline-flex items-center gap-2">
            <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />
            PracticeReady FAQs
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl">
            Answers about how PracticeReady works.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            What the platform does, how it fits alongside mandatory training, and what managers and
            staff can do with it.
          </p>
        </section>

        <section className="rounded-md border border-border bg-card px-6 py-2 shadow-[0_1px_2px_rgba(15,30,60,0.04)] sm:px-8">
          <Accordion type="single" collapsible defaultValue="faq-0">
            {FAQS.map(([question, answer], i) => (
              <AccordionItem key={question} value={`faq-${i}`} className="border-border">
                <AccordionTrigger className="font-display text-base font-semibold hover:no-underline sm:text-lg">
                  {question}
                </AccordionTrigger>
                <AccordionContent className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                  {answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mt-12 flex flex-col items-start justify-between gap-6 rounded-lg bg-secondary px-6 py-8 sm:flex-row sm:items-center md:px-10">
          <div>
            <h2 className="font-display text-2xl font-bold">
              {account
                ? "Ready to keep training up to date?"
                : "Interested in seeing PracticeReady?"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {account
                ? "Head to your dashboard to review scenarios and assign modules."
                : "We’re working with primary care teams on pilots — start an account to explore the platform."}
            </p>
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 px-6">
            <Link
              to={account ? (account.role === "manager" ? "/dashboard" : "/staff") : "/auth"}
              search={account ? undefined : { mode: "create" }}
            >
              {account ? "Go to dashboard" : "Create a practice account"}{" "}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </div>
    </MarketingShell>
  );
}
