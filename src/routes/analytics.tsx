import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Shell, Card, Badge } from "@/components/Shell";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { summarise, type AnalyticsData } from "@/lib/analytics";
import { api } from "@/lib/backend";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/analytics")({
  validateSearch: (s: Record<string, unknown>): { practice?: string } => ({
    practice: typeof s.practice === "string" ? s.practice : undefined,
  }),
  head: () => ({ meta: [{ title: "Analytics — PracticeReady" }] }),
  component: Analytics,
});

const countConfig = { count: { label: "Count", color: "var(--primary)" } } satisfies ChartConfig;
const statusConfig = {
  completed: { label: "Completed", color: "var(--success)" },
  in_progress: { label: "In progress", color: "var(--primary)" },
  not_started: { label: "Not started", color: "var(--muted-foreground)" },
  overdue: { label: "Overdue", color: "var(--destructive)" },
} satisfies ChartConfig;
const minutesConfig = {
  minutes: { label: "Median minutes", color: "var(--primary)" },
} satisfies ChartConfig;

const date = (ms?: number) => (ms ? new Date(ms).toLocaleDateString("en-GB") : "Never");
const mins = (m?: number) => (m === undefined ? "—" : `${Math.round(m)} min`);
const shortWeek = (w: string) => w.slice(8, 10) + "/" + w.slice(5, 7);

function Analytics() {
  const own = useApp((s) => s.account?.practiceId);
  const platformAdmin = useApp((s) => s.account?.platformAdmin);
  const [practiceId, setPracticeId] = useState(Route.useSearch().practice ?? own);
  const [data, setData] = useState<AnalyticsData>();
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    setError("");
    api<AnalyticsData>("analytics", { practiceId })
      .then((d) => current && setData(d))
      .catch((e) => current && setError(e.message));
    return () => {
      current = false;
    };
  }, [practiceId]);

  const summary = useMemo(() => data && summarise(data), [data]);

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to={platformAdmin ? "/admin" : "/dashboard"}
            className="text-sm text-muted-foreground hover:underline"
          >
            {platformAdmin ? "← All practices" : "← Manager dashboard"}
          </Link>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Analytics</h1>
        </div>
        {data?.practices && (
          <Select value={practiceId} onValueChange={setPracticeId}>
            <SelectTrigger className="w-72" aria-label="Practice">
              <SelectValue placeholder="Choose a practice" />
            </SelectTrigger>
            <SelectContent>
              {data.practices.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error}
        </p>
      )}
      {!summary && !error && (
        <p className="mt-6" role="status">
          Loading analytics…
        </p>
      )}

      {summary && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Active staff", summary.kpis.activeStaff],
              ["Signed in (7 days)", summary.kpis.loggedIn7],
              ["Modules completed (30 days)", summary.kpis.completed30],
              ["Overdue assignments", summary.kpis.overdue],
              ["Median time to complete", mins(summary.kpis.medianMinutes)],
            ].map(([label, value]) => (
              <Card key={label} className="p-4">
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="mt-1 text-2xl font-bold">{value}</div>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Sign-ins per week">
              <WeeklyBars data={summary.loginsByWeek} />
            </ChartCard>
            <ChartCard title="Modules completed per week">
              <WeeklyBars data={summary.completionsByWeek} />
            </ChartCard>
            <ChartCard
              title="Assignment status by module"
              empty={summary.moduleStatus.length ? undefined : "No modules assigned yet."}
            >
              <ChartContainer config={statusConfig} className="h-64 w-full">
                <BarChart data={summary.moduleStatus} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="module" width={120} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {Object.keys(statusConfig).map((k) => (
                    <Bar key={k} dataKey={k} stackId="s" fill={`var(--color-${k})`} />
                  ))}
                </BarChart>
              </ChartContainer>
            </ChartCard>
            <ChartCard
              title="Median time to complete, by module"
              empty={summary.moduleDuration.length ? undefined : "No timed completions yet."}
            >
              <ChartContainer config={minutesConfig} className="h-64 w-full">
                <BarChart data={summary.moduleDuration} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" unit=" min" />
                  <YAxis type="category" dataKey="module" width={120} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="minutes" fill="var(--color-minutes)" radius={4} />
                </BarChart>
              </ChartContainer>
            </ChartCard>
          </div>

          <Card className="mt-6 overflow-x-auto">
            <h2 className="font-semibold">Staff</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  {[
                    "Name",
                    "Last sign-in",
                    "Sign-ins (30 days)",
                    "Assigned",
                    "Started",
                    "Completed",
                    "Overdue",
                    "Avg score",
                    "Avg time",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.staffRows.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-2 py-2">
                      {s.role === "trainee" && practiceId === own ? (
                        <Link
                          to="/trainees/$id"
                          params={{ id: s.id }}
                          className="font-medium hover:underline"
                        >
                          {s.name || "Unnamed"}
                        </Link>
                      ) : (
                        <span className="font-medium">{s.name || "Unnamed"}</span>
                      )}{" "}
                      {s.role === "manager" && <Badge>Manager</Badge>}{" "}
                      {s.inactiveAt && <Badge>Inactive</Badge>}{" "}
                      {s.dormant && <Badge tone="draft">No sign-in for 30+ days</Badge>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{date(s.lastLogin)}</td>
                    <td className="px-2 py-2">{s.logins30}</td>
                    <td className="px-2 py-2">{s.assigned}</td>
                    <td className="px-2 py-2">{s.started}</td>
                    <td className="px-2 py-2">{s.completed}</td>
                    <td className="px-2 py-2">{s.overdue}</td>
                    <td className="px-2 py-2">
                      {s.avgScore === undefined ? "—" : `${Math.round(s.avgScore)}%`}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{mins(s.avgMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Time is measured from opening a module to finishing it, so it includes breaks.
              Attempts started before tracking began have no time.
            </p>
          </Card>
        </>
      )}
    </Shell>
  );
}

function ChartCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {empty ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        children
      )}
    </Card>
  );
}

function WeeklyBars({ data }: { data: { week: string; count: number }[] }) {
  return (
    <ChartContainer config={countConfig} className="h-56 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickFormatter={shortWeek} tickLine={false} />
        <YAxis allowDecimals={false} width={28} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(w) => `Week of ${w}`} />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
