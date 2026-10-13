import {
  pendingQuestionReviews,
  questionReviewScope,
  recordedSourceChanges,
  reviewKey,
} from "@/lib/practice-change-tracking";
import { useManagerAction } from "@/hooks/use-manager-action";
import { readProcedureDiagnostics } from "@/lib/dev-procedure-diagnostics";
import { orderKey, orderLabels } from "@/lib/sequence";
import { inspectRoleMatching, uniqueMatching } from "@/lib/role-matching";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shell, Card, Badge } from "@/components/Shell";
import { useApp, type Scenario } from "@/lib/store";

export const Route = createFileRoute("/modules/review")({
  head: () => ({ meta: [{ title: "Review training — PracticeReady" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) || "" }),
  component: Review,
});

function Review() {
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const action = useManagerAction();
  const module = useApp((s) => s.modules.find((m) => m.id === id));
  const { practiceData, approveScenario, deleteScenario, regenerateScenario, updateScenario } =
    useApp();

  const matchingDiagnostic = useMemo(
    () =>
      module?.topicKey === "appointment-booking" &&
      module.settings?.trainingLevel === "learn" &&
      !module.scenarios.some((s) => s.kind === "matching")
        ? inspectRoleMatching(practiceData).diagnostic
        : undefined,
    [module, practiceData],
  );

  if (!module) {
    return (
      <Shell>
        <Card>
          <p>Module not found.</p>
          <Link to="/dashboard" className="mt-3 inline-block text-primary hover:underline">
            Back to dashboard
          </Link>
        </Card>
      </Shell>
    );
  }

  const allApproved =
    module.scenarios.length > 0 && module.scenarios.every((s) => s.status === "approved");

  const currentReviewKey = reviewKey(module, practiceData);
  const pendingReviews = pendingQuestionReviews(module, practiceData);
  const reviewScope = questionReviewScope(module);
  const decisionReady = pendingReviews.length === 0;
  const publish = () =>
    void action.run(
      {
        kind: "publish",
        moduleId: module.id,
        ...(module.needsReview ? { reviewKey: currentReviewKey } : {}),
      },
      () => nav({ to: "/dashboard" }),
    );
  return (
    <Shell>
      {action.error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {action.error}
        </p>
      )}
      <fieldset disabled={action.saving} className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {module.type} · {module.published ? "Published module review" : "Draft review"}
              {module.settings?.trainingLevel
                ? ` · ${module.settings.trainingLevel === "learn" ? "Learn" : "Apply"}`
                : ""}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
              {module.published ? "Review training" : "Review draft scenarios"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {module.published
                ? "Review all questions and their saved answers below. No answers or training attempt are required."
                : "Manager review required. Approve every scenario, then publish the module for staff."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={publish}
              disabled={!allApproved || action.saving || (!!module.needsReview && !decisionReady)}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {action.pending?.kind === "publish"
                ? "Publishing…"
                : module.needsReview
                  ? "Publish reviewed module"
                  : "Publish module"}
            </button>
            <button
              type="button"
              disabled={action.saving || module.published}
              onClick={() => {
                if (window.confirm("Delete this draft module?")) {
                  void action.run({ kind: "delete-draft", moduleId: module.id }, () =>
                    nav({ to: "/dashboard" }),
                  );
                }
              }}
              className="rounded-xl border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/5"
            >
              {action.pending?.kind === "delete-draft" ? "Deleting…" : "Delete draft"}
            </button>
          </div>
        </div>

        {module.needsReview && (
          <Card className="mt-6 border-warning/40 bg-warning/5">
            <h2 className="font-semibold">Needs review — training paused</h2>
            <p className="mt-2 whitespace-pre-line text-sm">
              {module.reviewReason ??
                "This training changed or may contain outdated practice information."}
            </p>
            <p className="mt-3 text-sm">
              {reviewScope.broad
                ? "We cannot reliably identify every affected question. Review and approve all questions before republishing this module. Highlights show recorded source links only."
                : "We’ve flagged the questions that may be affected below. Review and approve these questions before republishing the module."}
            </p>
            <p className="mt-2 text-sm">
              {pendingReviews.length} questions awaiting review approval.
            </p>
            <p className="mt-3 text-sm">
              Existing attempts keep their original questions. Reassign corrected training to staff
              who have already started it.
            </p>
            <Link to="/data-hub" className="mt-3 inline-block text-sm text-primary underline">
              View current practice information
            </Link>
          </Card>
        )}
        {!!module.reviewConfirmations?.length && (
          <details className="mt-6 rounded-xl border p-4 text-sm">
            <summary>Recorded review decisions</summary>
            <ul className="mt-3 space-y-3">
              {module.reviewConfirmations.map((record) => (
                <li key={record.id}>
                  <p className="font-medium">
                    {record.decision === "unchanged"
                      ? "Confirmed existing training still correct"
                      : "Reviewed and republished"}
                  </p>
                  <p>
                    {record.name || record.by} ·{" "}
                    {new Date(record.at).toLocaleString("en-GB", { timeZone: "Europe/London" })}
                  </p>
                  <p className="whitespace-pre-wrap">{record.note}</p>
                  <ul>
                    {record.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </details>
        )}

        {module.settings && (
          <Card className="mt-6">
            <p>
              {module.scenarios.filter((s) => !s.followUpFor).length} scenarios · Requested length:{" "}
              {module.settings.length} ({module.settings.count})
            </p>
            <Link
              className="text-primary underline"
              to="/modules/setup"
              search={{ id: module.id, topic: module.topicKey, title: module.type }}
            >
              Edit settings and regenerate module
            </Link>
          </Card>
        )}

        {module.topicKey === "appointment-booking" && readProcedureDiagnostics(module.id) && (
          <details className="mt-3 rounded-xl border p-3 text-sm">
            <summary>Development only: procedure generation diagnostics</summary>
            <p>
              Captured from saved workspace data when this draft was generated. Not a live
              eligibility check.
            </p>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {JSON.stringify(JSON.parse(readProcedureDiagnostics(module.id)!), null, 2)}
            </pre>
          </details>
        )}
        {matchingDiagnostic && (
          <p className="mt-4 text-sm text-muted-foreground">
            <strong>Matching:</strong> This module contains no matching board. Current role
            configuration: {matchingDiagnostic.message}
            {matchingDiagnostic.code === "ready" &&
              " Regenerate the Learn module to include one when there is room alongside other local questions."}
          </p>
        )}
        <div className="mt-8 space-y-5">
          {module.scenarios.map((s) => (
            <ScenarioCard
              appointmentBooking={module.topicKey === "appointment-booking"}
              key={s.id}
              scenario={s}
              reviewRequired={pendingReviews.includes(s.id)}
              reviewingChanges={!!module.needsReview}
              sourceChanges={
                module.needsReview
                  ? recordedSourceChanges(s, module.reviewChanges ?? []).map(
                      (change) => change.reason,
                    )
                  : []
              }
              onApprove={() => approveScenario(module.id, s.id)}
              onDelete={() => deleteScenario(module.id, s.id)}
              onRegenerate={() => regenerateScenario(module.id, s.id)}
              onSave={(next) => updateScenario(module.id, next)}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
          <div className="text-sm text-muted-foreground">
            {pendingReviews.length
              ? "Review and approve the required questions before republishing."
              : allApproved
                ? "All scenarios approved — ready to publish to staff."
                : "Approve every scenario above before publishing."}
          </div>
          <button
            onClick={publish}
            disabled={!allApproved || action.saving || (!!module.needsReview && !decisionReady)}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {action.pending?.kind === "publish"
              ? "Publishing…"
              : module.needsReview
                ? "Publish reviewed module"
                : "Publish module"}
          </button>
        </div>
      </fieldset>
    </Shell>
  );
}

function ScenarioCard({
  sourceChanges = [],
  reviewRequired = false,
  reviewingChanges = false,
  appointmentBooking,
  scenario,
  onApprove,
  onDelete,
  onRegenerate,
  onSave,
}: {
  sourceChanges?: string[];
  reviewRequired?: boolean;
  reviewingChanges?: boolean;
  appointmentBooking?: boolean;
  scenario: Scenario;
  onApprove: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onSave: (s: Scenario) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [regenerationError, setRegenerationError] = useState("");
  const [draft, setDraft] = useState<Scenario>(scenario);
  const solution =
    scenario.kind === "matching" && scenario.pairingMode === "one_to_one"
      ? uniqueMatching(
          scenario.items.map((i) => i.id),
          scenario.targets.map((t) => t.id),
          scenario.validMatches,
        )
      : undefined;

  return (
    <Card>
      {sourceChanges.length > 0 && (
        <div className="mb-3 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
          <p className="font-semibold">
            {reviewRequired ? "Needs review" : "Reviewed"} — Practice information used by this
            question has changed.
          </p>
          <ul className="mt-1 list-disc pl-5">
            {sourceChanges.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {scenario.followUpFor
              ? "Follow-up practice · shown after a missed answer"
              : scenario.kind === "mcq"
                ? "Multiple choice"
                : scenario.kind === "matching"
                  ? "Matching"
                  : "Put steps in order"}
          </div>
          {editing ? (
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-input bg-background p-2 font-display text-lg font-semibold"
            />
          ) : (
            <h3 className="mt-1 font-display text-lg font-semibold">{scenario.title}</h3>
          )}
        </div>
        <Badge tone={scenario.status === "approved" && !reviewRequired ? "approved" : "draft"}>
          {scenario.status === "approved" && !reviewRequired
            ? "Approved"
            : "Requires manager review"}
        </Badge>
      </div>

      {scenario.kind !== "matching" &&
        draft.kind !== "matching" &&
        !(scenario.kind === "order" && scenario.sequence) && (
          <blockquote className="mt-3 rounded-lg border-l-4 border-accent bg-surface p-3 text-sm italic">
            {editing && draft.provenance?.kind !== "sequence" ? (
              <textarea
                value={draft.patientQuote}
                onChange={(e) => setDraft({ ...draft, patientQuote: e.target.value })}
                className="w-full resize-none bg-transparent outline-none"
                rows={2}
              />
            ) : (
              <>&ldquo;{scenario.patientQuote}&rdquo;</>
            )}
          </blockquote>
        )}

      <p className="mt-4 text-sm font-medium">
        {editing ? (
          <input
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            className="w-full rounded-lg border border-input bg-background p-2"
          />
        ) : (
          scenario.question
        )}
      </p>

      {editing && draft.kind === "mcq" && draft.provenance?.kind !== "sequence" && (
        <label className="mt-3 block text-sm">
          Best answer
          <select
            className="ml-3 rounded-lg border border-input bg-background p-2"
            value={draft.correctIndex}
            onChange={(e) => setDraft({ ...draft, correctIndex: Number(e.target.value) })}
          >
            {draft.options.map((_, i) => (
              <option key={i} value={i}>
                Option {String.fromCharCode(65 + i)}
              </option>
            ))}
          </select>
        </label>
      )}

      {scenario.kind === "mcq" && draft.kind === "mcq" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {scenario.options.map((opt, i) => {
            const isBest = i === (editing ? draft.correctIndex : scenario.correctIndex);
            return (
              <div
                key={i}
                className={`rounded-lg border p-3 text-sm ${
                  isBest ? "border-accent/60 bg-accent/5" : "border-border"
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Option {String.fromCharCode(65 + i)}</span>
                  {isBest && <span className="text-[color:var(--success)]">Best answer</span>}
                </div>
                {editing && draft.provenance?.kind !== "sequence" ? (
                  <textarea
                    value={draft.options[i]}
                    onChange={(e) => {
                      const next = [...draft.options];
                      next[i] = e.target.value;
                      setDraft({ ...draft, options: next });
                    }}
                    rows={3}
                    className="w-full resize-none bg-transparent outline-none"
                  />
                ) : (
                  opt
                )}
              </div>
            );
          })}
        </div>
      )}

      {scenario.kind === "matching" && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            These mappings come from confirmed Practice Setup role responsibilities.
            {scenario.pairingMode === "one_to_one"
              ? " Each role card is used once in this board."
              : " Roles can be used more than once."}{" "}
            Other roles not shown may also handle a request.
          </p>
          {scenario.items.map((item) => (
            <div
              key={item.id}
              className="grid gap-2 rounded-lg border border-border p-3 text-sm sm:grid-cols-2"
            >
              <span>{item.label}</span>
              <span>
                {solution && (
                  <strong className="block">
                    Board pair: {scenario.targets.find((t) => t.id === solution[item.id])?.label}
                  </strong>
                )}
                {solution ? "All valid shown roles: " : ""}
                {scenario.targets
                  .filter((t) => scenario.validMatches[item.id]?.includes(t.id))
                  .map((t) => t.label)
                  .join(" or ")}
              </span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Mappings are retained from generation. During a practice-change review, Regenerate uses
            the current confirmed role responsibilities.
          </p>
        </div>
      )}

      {scenario.provenance?.kind === "sequence" && scenario.provenance.snapshot.localProcedure && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium">
            Local Procedure ·{" "}
            {scenario.provenance.snapshot.localProcedure.requestLabelAtConfirmation} · Version{" "}
            {scenario.provenance.sourceVersion}
          </p>
          <p>Manager-confirmed practice procedure</p>
          {scenario.provenance.snapshot.localProcedure.appliesWhen && (
            <p className="whitespace-pre-wrap">
              {scenario.provenance.snapshot.localProcedure.appliesWhen}
            </p>
          )}
          <p className="text-muted-foreground">
            This exercise retains its saved procedure. During a practice-change review, Regenerate
            uses the current confirmed procedure if it is eligible.
          </p>
        </div>
      )}
      {scenario.kind === "order" && draft.kind === "order" && (
        <ol className="mt-3 space-y-2">
          {orderLabels(scenario, orderKey(scenario)).map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
            >
              <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              {editing && !draft.sequence ? (
                <input
                  value={draft.steps[i]}
                  onChange={(e) => {
                    const next = [...draft.steps];
                    next[i] = e.target.value;
                    setDraft({ ...draft, steps: next });
                  }}
                  className="w-full bg-transparent outline-none"
                />
              ) : (
                <span className="whitespace-pre-wrap">{s}</span>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 rounded-lg bg-surface p-3 text-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Learning point
        </div>
        {editing ? (
          <textarea
            value={draft.learningPoint}
            onChange={(e) => setDraft({ ...draft, learningPoint: e.target.value })}
            className="mt-1 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm"
            rows={3}
          />
        ) : (
          <p className="mt-1 text-muted-foreground">{scenario.learningPoint}</p>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-accent/40 bg-accent/5 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Additional information (optional)
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Anything the draft missed. Trainees see this with the learning point.
        </p>
        <textarea
          value={draft.managerNote ?? ""}
          onChange={(e) => {
            const note = e.target.value;
            setDraft((d) => ({ ...d, managerNote: note }) as Scenario);
            onSave({ ...scenario, managerNote: note } as Scenario);
          }}
          rows={2}
          placeholder={
            appointmentBooking
              ? "e.g. Add any practice-specific context trainees should know."
              : "e.g. Always check the patient's preferred pharmacy before confirming."
          }
          className="mt-2 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {regenerationError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {regenerationError}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {editing ? (
          <>
            <button
              onClick={() => {
                onSave(draft);
                setEditing(false);
              }}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Save changes
            </button>
            <button
              onClick={() => {
                setDraft(scenario);
                setEditing(false);
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onApprove}
              disabled={scenario.status === "approved" && !reviewRequired}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
            >
              Approve
            </button>
            <button
              onClick={() => {
                setDraft(scenario);
                setEditing(true);
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Edit
            </button>
            <button
              disabled={scenario.provenance?.kind === "sequence" && !reviewingChanges}
              title={
                scenario.provenance?.kind === "sequence"
                  ? reviewingChanges
                    ? "Regenerate from the current confirmed procedure."
                    : "Generate a new module to use updated procedure information."
                  : undefined
              }
              onClick={() => {
                setRegenerationError("");
                try {
                  onRegenerate();
                } catch (error) {
                  setRegenerationError(
                    error instanceof Error ? error.message : "Could not regenerate this question.",
                  );
                }
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Regenerate
            </button>
            <button
              onClick={onDelete}
              className="ml-auto rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
