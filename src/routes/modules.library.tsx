import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { api } from "@/lib/backend";
import { TOPICS } from "@/lib/store";
import type { Module } from "@/lib/training-types";
import type { PublicModuleSummary } from "@/lib/shared-modules";
import { useManagerAction } from "@/hooks/use-manager-action";

export const Route = createFileRoute("/modules/library")({
  head: () => ({ meta: [{ title: "Shared modules — PracticeReady" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const nav = useNavigate();
  const action = useManagerAction();
  const [modules, setModules] = useState<PublicModuleSummary[] | null>(null);
  const [error, setError] = useState("");
  const [copying, setCopying] = useState("");

  useEffect(() => {
    api<{ modules: PublicModuleSummary[] }>("list-public-modules")
      .then((r) => setModules(r.modules))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load shared modules."));
  }, []);

  const copy = async (m: PublicModuleSummary) => {
    setCopying(m.id);
    setError("");
    try {
      const { module } = await api<{ module: Module }>("copy-public-module", {
        practiceId: m.practiceId,
        moduleId: m.id,
      });
      await action.run({ kind: "copy", moduleId: module.id, module }, () =>
        nav({ to: "/modules/review", search: { id: module.id } }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not copy this module.");
    } finally {
      setCopying("");
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <Link to="/modules/create" className="text-sm text-primary hover:underline">
          ← Back to create module
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Shared modules</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Modules other practices have shared. Copying one adds it to your practice as a draft, so
          you can check every question against your own procedures before publishing.
        </p>
        {(error || action.error) && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error || action.error}
          </p>
        )}
        <Card className="mt-6">
          {modules === null && !error && <p className="text-sm">Loading…</p>}
          {modules?.length === 0 && (
            <p className="text-sm text-muted-foreground">No modules have been shared yet.</p>
          )}
          <ul className="space-y-2">
            {modules?.map((m) => (
              <li
                key={`${m.practiceId}:${m.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"
              >
                <span>
                  <span className="block font-medium">{m.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {TOPICS.find((t) => t.key === m.topicKey)?.title ?? m.type} · {m.scenarioCount}{" "}
                    questions
                  </span>
                </span>
                <button
                  disabled={action.saving || !!copying}
                  onClick={() => void copy(m)}
                  className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                >
                  {copying === m.id ? "Copying…" : "Copy to my practice"}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
