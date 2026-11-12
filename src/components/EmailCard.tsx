import type { Scenario } from "@/lib/training-types";

/** A simulated email; rendered as plain text so no link in the content is ever clickable. */
export function EmailCard({ scenario }: { scenario: Scenario }) {
  if (!("email" in scenario) || !scenario.email) return null;
  const { from, subject, body } = scenario.email;
  return (
    <figure
      aria-label="Email being reviewed"
      className="mt-4 overflow-hidden rounded-lg border border-border bg-surface text-sm"
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-border p-3">
        <dt className="text-muted-foreground">From</dt>
        <dd className="break-all font-medium">{from}</dd>
        <dt className="text-muted-foreground">Subject</dt>
        <dd className="font-medium">{subject}</dd>
      </dl>
      <p className="whitespace-pre-wrap break-words p-3">{body}</p>
    </figure>
  );
}
