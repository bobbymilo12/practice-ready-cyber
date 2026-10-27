import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Card } from "@/components/Shell";
import type { PracticeOverview } from "@/lib/analytics";
import { api } from "@/lib/backend";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — PracticeReady" }] }),
  component: Admin,
});

const date = (ms?: number) => (ms ? new Date(ms).toLocaleDateString("en-GB") : "Never");

function Admin() {
  const [data, setData] = useState<PracticeOverview>();
  const [error, setError] = useState("");
  useEffect(() => {
    api<PracticeOverview>("admin_overview")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <Shell>
      <h1 className="font-display text-3xl font-bold tracking-tight">PracticeReady admin</h1>
      <p className="mt-1 text-muted-foreground">Every practice using PracticeReady.</p>
      {error && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error}
        </p>
      )}
      {!data && !error && (
        <p className="mt-6" role="status">
          Loading practices…
        </p>
      )}
      {data && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Practices", data.totals.practices],
              ["Active staff", data.totals.activeStaff],
              ["Sign-ins (7 days)", data.totals.logins7],
              ["Modules completed (30 days)", data.totals.completed30],
            ].map(([label, value]) => (
              <Card key={label} className="p-4">
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="mt-1 text-2xl font-bold">{value}</div>
              </Card>
            ))}
          </div>
          <Card className="mt-6 overflow-x-auto">
            <h2 className="font-semibold">Practices</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  {[
                    "Practice",
                    "Manager",
                    "Active staff",
                    "Last sign-in",
                    "Sign-ins (30 days)",
                    "Completed (30 days)",
                    "Completed (all)",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.practices.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-2 py-2">
                      <Link
                        to="/analytics"
                        search={{ practice: p.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      {p.managers.map((m) => (
                        <a key={m} href={`mailto:${m}`} className="block hover:underline">
                          {m}
                        </a>
                      ))}
                    </td>
                    <td className="px-2 py-2">{p.activeStaff}</td>
                    <td className="whitespace-nowrap px-2 py-2">{date(p.lastLogin)}</td>
                    <td className="px-2 py-2">{p.logins30}</td>
                    <td className="px-2 py-2">{p.completed30}</td>
                    <td className="px-2 py-2">{p.completedTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Select a practice to see its charts and staff.
            </p>
          </Card>
        </>
      )}
    </Shell>
  );
}
