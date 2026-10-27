import type { SupabaseClient } from "@supabase/supabase-js";
type Auth = SupabaseClient["auth"];
export const recoveryMessage =
  "If an account uses that email, you’ll receive a password-reset link. Check your inbox and junk folder. If it doesn’t arrive, wait a few minutes and try again.";

export async function requestPasswordRecovery(
  auth: Pick<Auth, "resetPasswordForEmail">,
  email: string,
  origin: string,
) {
  // Never render provider responses that could disclose account existence.
  try {
    await auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin}/auth?mode=recovery` });
  } catch {
    /* The same response covers unavailable, unknown and rate-limited addresses. */
  }
  return recoveryMessage;
}
export async function finishPasswordRecovery(
  auth: Pick<Auth, "getUser" | "updateUser">,
  recoveryUserId: string | null,
  password: string,
  confirm: string,
  account: () => Promise<{ mustResetPassword?: boolean }>,
  activate: () => Promise<unknown> = async () => {},
) {
  if (!recoveryUserId)
    throw new Error("This reset link is invalid or has expired. Request a new link.");
  if (password.length < 12 || password !== confirm)
    throw new Error("Use at least 12 characters and make sure both passwords match.");
  const { data, error } = await auth.getUser();
  if (error || data.user?.id !== recoveryUserId)
    throw new Error("This reset link is invalid or has expired. Request a new link.");
  // An invited account is activated by this verified link: the emailed link is how they get in.
  const invited = Boolean((await account()).mustResetPassword);
  const result = await auth.updateUser({ password });
  if (result.error)
    throw new Error(
      "Your password could not be updated. Check the password requirements or request a new reset link.",
    );
  if (invited) await activate();
}
