import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
export const Route = createFileRoute("/modules/create")({
  head: () => ({ meta: [{ title: "Create module — PracticeReady" }] }),
  component: CreateModule,
});
function CreateModule() {
  return (
    <Shell>
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-bold">Create a module</h1>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <p className="font-semibold">Cyber security modules are coming soon.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Until then you can{" "}
            <Link to="/modules/merge" className="text-primary underline">
              combine existing modules
            </Link>{" "}
            or{" "}
            <Link to="/modules/library" className="text-primary underline">
              copy a module another practice shared
            </Link>
            .
          </p>
        </div>
      </div>
    </Shell>
  );
}
