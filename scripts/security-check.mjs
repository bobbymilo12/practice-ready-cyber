// Live isolation/session check against a real Supabase project + deployed practice-api.
// Creates two throwaway practices (zz-sectest-*), probes cross-practice, cross-role, direct-DB
// and session access, then deletes everything it created.
// Usage: SUPABASE_URL=… SUPABASE_PUBLISHABLE_KEY=… SUPABASE_SECRET_KEY=… SECURITY_CHECK_CONFIRM=yes node scripts/security-check.mjs
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const {
  SUPABASE_URL: url,
  SUPABASE_PUBLISHABLE_KEY: anonKey,
  SUPABASE_SECRET_KEY: secretKey,
} = process.env;
if (!url || !anonKey || !secretKey || process.env.SECURITY_CHECK_CONFIRM !== "yes") {
  console.error(
    "Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY and SECURITY_CHECK_CONFIRM=yes.",
  );
  process.exit(2);
}
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secretKey, opts);
const run = randomUUID().slice(0, 8);
const results = [];
const expect = (name, pass, detail = "") => results.push({ name, pass: !!pass, detail });

async function api(token, body) {
  const r = await fetch(`${url}/functions/v1/practice-api`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json().catch(() => null) };
}
async function signIn(email, password) {
  const c = createClient(url, anonKey, opts);
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return { client: c, token: data.session.access_token };
}
const password = () => `Sx!${randomUUID()}`;
const created = [];

async function manager(tag) {
  const email = `zz-sectest-${run}-${tag}@example.invalid`;
  const pw = password();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
  });
  if (error) throw error;
  created.push(data.user.id);
  const { data: profile } = await admin
    .from("profiles")
    .select("practice_id")
    .eq("id", data.user.id)
    .single();
  return { id: data.user.id, email, pw, practiceId: profile.practice_id };
}
async function trainee(tag, practiceId) {
  const email = `zz-sectest-${run}-${tag}@example.invalid`;
  const pw = password();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
    app_metadata: { invited_trainee: true },
  });
  if (error) throw error;
  created.push(data.user.id);
  const now = new Date().toISOString();
  const { error: e } = await admin.from("profiles").insert({
    id: data.user.id,
    practice_id: practiceId,
    role: "trainee",
    name: `zz-sectest ${tag}`,
    email,
    must_reset_password: false,
    invited_at: now,
    last_invite_at: now,
    invite_status: "active",
  });
  if (e) throw e;
  return { id: data.user.id, email, pw };
}

const managers = [];
try {
  const mA = await manager("manager-a");
  const mB = await manager("manager-b");
  managers.push(mA, mB);
  const tA = await trainee("trainee-a", mA.practiceId);
  const tB = await trainee("trainee-b", mB.practiceId);
  const sA = await signIn(mA.email, mA.pw);
  const sTA = await signIn(tA.email, tA.pw);
  Object.assign(mA, sA);
  Object.assign(mB, await signIn(mB.email, mB.pw));

  // Practice isolation
  const loadA = await api(mA.token, { action: "load" });
  expect("manager A load ok", loadA.status === 200, loadA.status);
  const ids = (loadA.data?.trainees ?? []).map((t) => t.id);
  expect("manager A sees own trainee", ids.includes(tA.id));
  expect("manager A cannot see practice B trainee", !ids.includes(tB.id));
  expect("load is scoped to A's practice", loadA.data?.account?.practiceId === mA.practiceId);
  const state = loadA.data?.state ?? {};
  const cross = await api(mA.token, {
    action: "save-practice",
    version: loadA.data?.version,
    state: {
      ...state,
      modules: state.modules ?? [],
      practiceData: state.practiceData ?? {},
      assignments: [{ id: randomUUID(), traineeId: tB.id, moduleId: "x", assignedAt: Date.now() }],
    },
  });
  expect("manager A cannot assign practice B trainee", cross.status >= 400, cross.status);
  const deact = await api(mA.token, { action: "set-staff-active", id: tB.id, active: false });
  expect("manager A cannot deactivate practice B trainee", deact.status >= 400, deact.status);
  const { data: tBAfter } = await admin
    .from("profiles")
    .select("inactive_at")
    .eq("id", tB.id)
    .single();
  expect("practice B trainee unchanged", tBAfter?.inactive_at === null);

  // Role isolation
  for (const action of [
    "save-practice",
    "invite",
    "remove-trainee",
    "set-staff-active",
    "delete-practice",
  ]) {
    const r = await api(sTA.token, { action, confirm: "DELETE", id: tA.id, active: false });
    expect(`trainee cannot ${action}`, r.status === 403, r.status);
  }
  const tLoad = await api(sTA.token, { action: "load" });
  expect(
    "trainee load hides other staff",
    (tLoad.data?.trainees ?? []).every((t) => t.id === tA.id),
  );
  const foreign = await api(sTA.token, { action: "start", assignmentId: randomUUID() });
  expect("trainee cannot start an unassigned module", foreign.status === 403, foreign.status);

  // Direct database bypass with the browser key + a real user JWT
  const tables = [
    "practices",
    "profiles",
    "training_sessions",
    "role_templates",
    "practice_settings",
    "practice_staff",
    "practice_roles",
    "practice_local_procedures",
    "practice_requests",
    "practice_modules",
    "cookie_consents",
    "page_views",
    "contact_messages",
  ];
  for (const [who, s] of [
    ["manager", sA],
    ["trainee", sTA],
  ]) {
    for (const t of tables) {
      const { data, error } = await s.client.from(t).select("*").limit(1);
      expect(
        `${who} cannot read ${t} directly`,
        error || !data?.length,
        error?.code ?? `${data?.length} rows`,
      );
      if (t === "contact_messages") continue; // public insert by design
      const { error: insertError } = await s.client.from(t).insert({});
      expect(`${who} cannot insert into ${t} directly`, insertError, insertError?.code);
    }
    for (const fn of [
      "load_practice_data",
      "save_practice_data",
      "write_practice_data",
      "load_practice_modules",
      "write_practice_modules",
      "set_staff_active",
      "purge_expired_personal_data",
    ]) {
      const { error } = await s.client.rpc(fn, {});
      expect(`${who} cannot call ${fn}()`, error, error?.code);
    }
  }

  // Sessions
  const second = await signIn(tA.email, tA.pw);
  await second.client.auth.signOut({ scope: "local" });
  const afterLogout = await api(second.token, { action: "load" });
  expect("logged-out token rejected", afterLogout.status === 401, afterLogout.status);
  const old = await signIn(tA.email, tA.pw);
  const current = await signIn(tA.email, tA.pw);
  const newPw = password();
  const changed = await api(current.token, {
    action: "password",
    currentPassword: tA.pw,
    password: newPw,
  });
  expect("password change ok", changed.status === 200, changed.status);
  const stale = await api(old.token, { action: "load" });
  expect("other session rejected after password change", stale.status === 401, stale.status);
  const garbage = await api("not-a-jwt", { action: "load" });
  expect("invalid token rejected", garbage.status === 401, garbage.status);

  // Staff lifecycle
  const off = await api(mA.token, { action: "set-staff-active", id: tA.id, active: false });
  expect("manager A can deactivate own trainee", off.status === 200, off.status);
  const inactive = await api(current.token, { action: "load" });
  expect("deactivated trainee blocked", inactive.status === 403, inactive.status);
  const on = await api(mA.token, { action: "set-staff-active", id: tA.id, active: true });
  expect("manager A can reactivate", on.status === 200, on.status);
  const back = await api(current.token, { action: "load" });
  expect("reactivated trainee allowed", back.status === 200, back.status);
} catch (error) {
  expect("script ran to completion", false, error.message);
} finally {
  for (const m of managers.filter((m) => m.token))
    await api(m.token, { action: "delete-practice", confirm: "DELETE" }).catch(() => {});
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => {});
  for (const m of managers) await admin.from("practices").delete().eq("id", m.practiceId);
  const { data: leftovers } = await admin
    .from("profiles")
    .select("id")
    .like("email", `zz-sectest-${run}-%`);
  expect(
    "cleanup removed all test profiles",
    !leftovers?.length,
    `${leftovers?.length ?? "?"} left`,
  );
}

console.table(
  results.map((r) => ({
    result: r.pass ? "PASS" : "FAIL",
    check: r.name,
    detail: String(r.detail),
  })),
);
const failed = results.filter((r) => !r.pass).length;
console.log(failed ? `${failed} check(s) FAILED` : "All checks passed");
process.exit(failed ? 1 : 0);
