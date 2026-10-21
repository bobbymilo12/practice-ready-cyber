import { Link } from "@tanstack/react-router";
import { Card } from "./Shell";
import { traineeSupport } from "@/lib/training-support";
import type { Trainee } from "@/lib/store";
import type { Module, Assignment } from "@/lib/training-types";
import type { TrainingSession } from "@/lib/training";

export function NeedsSupport({
  trainees,
  assignments,
  modules,
  sessions,
}: {
  trainees: Trainee[];
  assignments: Assignment[];
  modules: Module[];
  sessions: TrainingSession[];
}) {
  const rows = trainees
    .map((trainee) => ({
      trainee,
      support: traineeSupport(trainee, assignments, modules, sessions),
    }))
    .filter((row) => row.support.length);
  return (
    <Card className="mt-6 border-primary/25">
      <h2 className="font-display text-xl font-semibold">Needs support</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Current training information to help you decide who to check in with. Completion and manager
        sign-off are separate.
      </p>
      {!rows.length ? (
        <p className="mt-4 text-sm">
          No current support signals in the recorded training. This does not confirm understanding
          or replace a conversation with your team.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {rows.map(({ trainee, support }) => (
            <li key={trainee.id} className="py-3 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{trainee.name || trainee.email}</h3>
                <Link
                  to="/trainees/$id"
                  params={{ id: trainee.id }}
                  className="text-sm font-semibold text-primary underline"
                >
                  View trainee and results
                </Link>
              </div>
              {support.map((item) => (
                <div key={item.assignmentId} className="mt-2 text-sm">
                  <p className="font-medium">{item.moduleTitle}</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {item.reasons.map((reason) => (
                      <li key={reason.kind}>{reason.text}</li>
                    ))}
                  </ul>
                  {item.practising && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Another attempt is in progress; the latest completed result is shown.
                    </p>
                  )}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
