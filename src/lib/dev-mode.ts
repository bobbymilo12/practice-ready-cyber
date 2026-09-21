import type { AccountRole } from "./store";

// No environment variable, URL parameter or storage value can enable this in a production build.
export function devAuthAvailable() {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
  );
}
const roleKey = "practiceready-dev-role-v1";
export function devRole(): AccountRole | null {
  if (!devAuthAvailable()) return null;
  const role = sessionStorage.getItem(roleKey);
  return role === "manager" || role === "trainee" ? role : null;
}
export function enterDevSession(role: AccountRole) {
  if (!devAuthAvailable())
    throw new Error("Mock authentication is only available locally in development.");
  sessionStorage.setItem(roleKey, role);
  // Reload to isolate subscriptions and in-flight requests from any real session.
  window.location.assign(role === "manager" ? "/dashboard" : "/staff");
}
export function leaveDevSession() {
  sessionStorage.removeItem(roleKey);
  window.location.assign("/auth");
}
