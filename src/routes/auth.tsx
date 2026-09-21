import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Card } from "@/components/Shell";
import { useApp } from "@/lib/store";

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
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState("");
  const setAccount = useApp((s) => s.setAccount);
  const createAccount = useApp((s) => s.createAccount);
  const loginAccount = useApp((s) => s.loginAccount);

  const resetPasswordFields = () => {
    setPassword("");
    setConfirm("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) {
      setError("Please choose Manager or Trainee.");
      return;
    }
    const trimmedEmail = email.trim();

    if (mode === "create" && (!name.trim() || !trimmedEmail || !phone.trim())) {
      setError("Please fill in your name, email and telephone number.");
      return;
    }
    if (mode === "login" && (!trimmedEmail || !password)) {
      setError("Please enter your email and password.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Please choose a password of at least 6 characters.");
      return;
    }
    if (mode === "create" && password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    if (mode === "create") {
      const ok = createAccount({
        name: name.trim() || trimmedEmail.split("@")[0],
        email: trimmedEmail,
        phone,
        password,
        role,
      });
      if (!ok) {
        setError("We could not save that account on this device. Please try a different email.");
        return;
      }
    } else {
      const ok = loginAccount(trimmedEmail, password, role);
      if (!ok) {
        setError("We couldn't match that account on this device. Check the role, email and password.");
        return;
      }
    }

    setError("");
    if (mode === "create") {
      setAccount({
        name: name.trim() || trimmedEmail.split("@")[0],
        email: trimmedEmail,
        phone,
        password,
        role,
      });
      resetPasswordFields();
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
              onClick={() => {
                setMode(m);
                resetPasswordFields();
              }}
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

            <label className="block text-sm">
              <span className="font-medium">Password</span>
              <div className="relative">
                <input
                  className={`${field} pr-10`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={mode === "create" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {mode === "create" && (
              <label className="block text-sm">
                <span className="font-medium">Confirm password</span>
                <div className="relative">
                  <input
                    className={`${field} pr-10`}
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
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
              Demo accounts are stored on this device only — please do not use a real work
              password. PracticeReady supports local onboarding and does not replace statutory or
              mandatory training.
            </p>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
