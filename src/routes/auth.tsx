import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Create account or log in — PracticeReady" },
      {
        name: "description",
        content:
          "Create your PracticeReady account or log in as a practice manager or reception trainee to start local onboarding.",
      },
      { property: "og:title", content: "Create account or log in — PracticeReady" },
      {
        property: "og:description",
        content:
          "Join PracticeReady as a manager or trainee to build and complete practice-specific onboarding modules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Role = "manager" | "trainee";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"create" | "login">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) {
      setError("Please choose Manager or Trainee.");
      return;
    }
    if (mode === "create" && (!name.trim() || !email.trim() || !phone.trim())) {
      setError("Please fill in your name, email and telephone number.");
      return;
    }
    if (mode === "login" && !email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setError("");
    try {
      localStorage.setItem(
        "pr_account",
        JSON.stringify({ name, email, phone, role }),
      );
    } catch {
      /* ignore storage issues */
    }
    navigate({ to: role === "manager" ? "/dashboard" : "/staff" });
  }

  const field =
    "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <Shell>
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {mode === "create" ? "Create your account" : "Log in"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Managers build modules for the practice. Trainees complete the modules assigned to them.
        </p>

        <div className="mt-6 inline-flex rounded-xl border border-border bg-surface p-1 text-sm">
          {(["create", "login"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-2 font-medium ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "create" ? "Create account" : "Login"}
            </button>
          ))}
        </div>

        <Card className="mt-6">
          <form onSubmit={submit} className="space-y-5">
            {mode === "create" && (
              <label className="block text-sm">
                <span className="font-medium">Full name</span>
                <input
                  className={field}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Cooper"
                  autoComplete="name"
                />
              </label>
            )}

            <label className="block text-sm">
              <span className="font-medium">Email</span>
              <input
                className={field}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@practice.nhs.uk"
                autoComplete="email"
              />
            </label>

            {mode === "create" && (
              <label className="block text-sm">
                <span className="font-medium">Telephone number</span>
                <input
                  className={field}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01234 567890"
                  autoComplete="tel"
                />
              </label>
            )}

            <div>
              <span className="text-sm font-medium">I am a</span>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(
                  [
                    ["manager", "Manager", "Build and publish modules"],
                    ["trainee", "Trainee", "Complete assigned modules"],
                  ] as const
                ).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      role === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-surface"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {mode === "create" ? "Create account" : "Log in"}
            </button>

            <p className="text-xs text-muted-foreground">
              PracticeReady supports local onboarding and does not replace statutory or mandatory
              training.
            </p>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
