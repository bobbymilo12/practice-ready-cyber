import { validateAssignmentLifecycle } from "../../../src/lib/staff-lifecycle.ts";
import {
  flagPracticeChanges,
  enforceReviewDecisions,
} from "../../../src/lib/practice-change-tracking.ts";
import { validateLocalProcedures } from "../../../src/lib/local-procedures.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  advanceSession,
  resumableAttempt,
  previousSession,
  answerSession,
  startSession,
  submitSession,
} from "../../../src/lib/training.ts";
import type { Assignment, Module } from "../../../src/lib/training-types.ts";
import type { TrainingSession } from "../../../src/lib/training.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey =
  Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const appUrl = Deno.env.get("APP_URL") ?? "";
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || appUrl).split(",").map((s) => s.trim());
class UserError extends Error {}
function fail(message: string): never {
  throw new UserError(message);
}
const check = (error: { message: string } | null) => {
  if (error)
    fail(
      "The service could not complete this request. Please retry or contact your practice manager.",
    );
};
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : appUrl,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  const reply = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });
  if (origin && !allowedOrigins.includes(origin))
    return reply({ error: "Origin not allowed." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return reply({ error: "POST required." }, 405);
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Please log in." }, 401);
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user)
      return reply({ error: "Your session has expired. Please log in." }, 401);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", auth.user.id)
      .single();
    check(profileError);
    if (!profile) return reply({ error: "Your account is not linked to a practice." }, 403);
    if (profile.inactive_at)
      return reply(
        { error: "Your practice access is inactive. Contact your practice manager." },
        403,
      );
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") fail("Invalid request.");
    const action = body.action;
    const manager = profile.role === "manager";
    const { data: practice, error: practiceError } = await admin
      .from("practices")
      .select("*")
      .eq("id", profile.practice_id)
      .single();
    check(practiceError);
    const state = practice.state;
    // Practice setup lives in tables (see 202610090001_practice_tables.sql), not in state.
    const loadPracticeData = async () => {
      const { data, error } = await admin.rpc("load_practice_data", {
        p_practice: profile.practice_id,
      });
      check(error);
      return data ?? undefined;
    };
    const loadRoleTemplates = async () => {
      const { data, error } = await admin.from("role_templates").select("*").order("position");
      check(error);
      return (data ?? []).map((t) => ({
        id: t.id,
        version: t.version,
        label: t.label,
        aliases: t.aliases,
        suggestions: { status: t.suggestions_status, selectedRequestIds: t.selected_request_ids },
      }));
    };
    // Modules live in practice_modules (see 202610100003_practice_modules.sql), not in state.
    const { data: moduleRows, error: modulesError } = await admin.rpc("load_practice_modules", {
      p_practice: profile.practice_id,
    });
    check(modulesError);
    const modules: Module[] = moduleRows ?? [];
    const assignments: Assignment[] = state.assignments ?? [];
    const account = {
      id: profile.id,
      practiceId: profile.practice_id,
      email: profile.email,
      name: profile.name,
      phone: "",
      role: profile.role,
      mustResetPassword: profile.must_reset_password,
    };

    if (action === "password") {
      if (typeof body.password !== "string" || body.password.length < 12)
        fail("Use at least 12 characters.");
      if (body.password === body.currentPassword)
        fail("Choose a different password from your temporary password.");
      // Reauthenticate before changing credentials. Do not trust a client reset flag.
      const verifier = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: verifyError } = await verifier.auth.signInWithPassword({
        email: profile.email,
        password: body.currentPassword,
      });
      if (verifyError) fail("Your current password is incorrect.");
      if (profile.must_reset_password && Date.now() - Date.parse(profile.invited_at) > 7 * 86400000)
        fail("This invitation expired. Ask your manager to resend it.");
      const { error } = await admin.auth.admin.updateUserById(profile.id, {
        password: body.password,
      });
      check(error);
      const { error: resetError } = await admin
        .from("profiles")
        .update({ must_reset_password: false, invite_status: "active" })
        .eq("id", profile.id);
      check(resetError);
      return reply({ ok: true });
    }
    if (profile.must_reset_password) {
      if (action === "load")
        return reply({ account, version: practice.version, state: {}, sessions: [], trainees: [] });
      return reply({ error: "Change your temporary password before starting training." }, 403);
    }

    if (action === "load") {
      let query = admin
        .from("training_sessions")
        .select("data")
        .eq("practice_id", profile.practice_id);
      if (!manager) query = query.eq("trainee_id", profile.id);
      const { data: rows, error } = await query;
      check(error);
      const { data: people, error: peopleError } = await admin
        .from("profiles")
        .select("id,name,email,job_role,must_reset_password,invited_at,invite_status,inactive_at")
        .eq("practice_id", profile.practice_id)
        .eq("role", "trainee");
      check(peopleError);
      const mine = assignments.filter((a) => a.traineeId === profile.id);
      return reply({
        account,
        version: practice.version,
        roleTemplates: manager ? await loadRoleTemplates() : undefined,
        state: manager
          ? { ...state, modules, practiceData: await loadPracticeData() }
          : {
              practiceData: {
                practiceName: (await loadPracticeData())?.practiceName || "Your practice",
              },
              modules: modules
                .filter((m) => m.published && mine.some((a) => a.moduleId === m.id))
                .map(
                  ({
                    reviewConfirmations: _history,
                    reviewChanges: _changes,
                    reviewedQuestions: _approvals,
                    ...module
                  }) => module,
                ),
              packages: (state.packages ?? []).filter((p: { moduleIds?: string[] }) =>
                (p.moduleIds ?? []).some((moduleId) => mine.some((a) => a.moduleId === moduleId)),
              ),
              assignments: mine,
              emojiMarks: Object.fromEntries(
                Object.entries(state.emojiMarks ?? {}).filter(([key]) =>
                  key.startsWith(`${profile.id}:`),
                ),
              ),
            },
        trainees: (people ?? [])
          .filter((t) => manager || t.id === profile.id)
          .map((t) => ({
            id: t.id,
            name: t.name,
            email: t.email,
            role: t.job_role,
            invitedAt: Date.parse(t.invited_at),
            status: t.must_reset_password ? "invited" : "active",
            inviteStatus: t.invite_status,
            inactiveAt: t.inactive_at ?? undefined,
          })),
        sessions: (rows ?? []).map((r) => r.data),
      });
    }

    if (action === "save-practice") {
      if (!manager) return reply({ error: "Manager access required." }, 403);
      const next = body.state;
      if (
        !next ||
        !Array.isArray(next.modules) ||
        !Array.isArray(next.assignments) ||
        !next.practiceData
      )
        fail("Invalid practice data.");
      validateLocalProcedures(next.practiceData.localProcedures);
      if (JSON.stringify(next).length > 2000000) fail("Practice data is too large.");
      const { data: people, error: peopleError } = await admin
        .from("profiles")
        .select("id,inactive_at")
        .eq("practice_id", profile.practice_id)
        .eq("role", "trainee");
      check(peopleError);
      const ids = new Set((people ?? []).map((p) => p.id));
      try {
        validateAssignmentLifecycle(
          assignments,
          next.assignments,
          new Set((people ?? []).filter((p) => p.inactive_at).map((p) => p.id)),
        );
      } catch (error) {
        fail(error instanceof Error ? error.message : "Invalid assignments.");
      }
      for (const a of next.assignments) {
        if (
          !ids.has(a.traineeId) ||
          (!a.withdrawnAt && !next.modules.some((m: Module) => m.id === a.moduleId && m.published))
        )
          fail("Assignments must refer to a trainee and published module in this practice.");
      }
      for (const m of next.modules as Module[]) {
        if (!m.id || !Array.isArray(m.scenarios)) fail("Invalid module.");
        if (
          m.published &&
          !m.needsReview &&
          (!m.scenarios.length || m.scenarios.some((s) => s.status !== "approved"))
        )
          fail("Approve every scenario before publishing.");
      }
      const previousPractice = await loadPracticeData();
      try {
        next.modules = enforceReviewDecisions(
          modules,
          next.modules,
          next.practiceData,
          { id: profile.id, name: profile.name },
          new Date().toISOString(),
          previousPractice,
        );
        next.modules = flagPracticeChanges(previousPractice, next.practiceData, next.modules);
      } catch (error) {
        fail(
          error instanceof Error ? error.message : "Review the affected training before saving.",
        );
      }
      // Explicit allowlist; credentials, profiles, results and sessions cannot be overwritten here.
      const clean = {
        modules: next.modules,
        packages: Array.isArray(next.packages) ? next.packages : [],
        assignments: next.assignments,
        setupComplete: Boolean(next.setupComplete),
        emojiMarks: next.emojiMarks ?? {},
        answers: next.answers ?? {},
        currentDraftId: next.currentDraftId ?? null,
      };
      const { data, error } = await admin.rpc("save_practice_data", {
        p_practice: practice.id,
        p_version: body.version,
        p_state: clean,
        p_data: next.practiceData,
      });
      check(error);
      if (data === null)
        return reply(
          {
            error: "The practice was edited on another device. Reload before making more changes.",
          },
          409,
        );
      return reply({
        version: data,
        reviewConfirmations: Object.fromEntries(
          next.modules
            .filter((m: Module) => m.reviewConfirmations?.length)
            .map((m: Module) => [m.id, m.reviewConfirmations]),
        ),
      });
    }

    if (action === "invite") {
      if (!manager) return reply({ error: "Manager access required." }, 403);
      const email = String(body.email ?? "")
        .trim()
        .toLowerCase();
      const name = String(body.name ?? "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name)
        fail("Enter the trainee's name and valid email.");
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const from = Deno.env.get("INVITE_FROM");
      if (!resendKey || !from || !appUrl)
        fail("Email invitations are not configured. Complete the setup guide first.");
      const { data: existing, error: existingError } = await admin
        .from("profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      check(existingError);
      if (
        existing &&
        (existing.practice_id !== profile.practice_id ||
          existing.role !== "trainee" ||
          !existing.must_reset_password)
      )
        fail("This email is already in use and has an account.");
      if (existing?.inactive_at)
        fail("Reactivate this staff member before resending an invitation.");
      if (existing?.last_invite_at && Date.now() - Date.parse(existing.last_invite_at) < 60000)
        fail("Please wait one minute before resending this invitation.");
      const password = `Pr!${crypto.randomUUID()}${crypto.randomUUID().slice(0, 8)}`;
      let traineeId = existing?.id;
      if (traineeId) {
        // Claim the resend before rotating credentials, so concurrent requests cannot email different passwords.
        const { data: claimed, error: claimError } = await admin
          .from("profiles")
          .update({ last_invite_at: new Date().toISOString() })
          .eq("id", traineeId)
          .eq("last_invite_at", existing.last_invite_at)
          .select("id")
          .maybeSingle();
        check(claimError);
        if (!claimed) fail("An invitation is already being sent. Try again shortly.");
        const { error } = await admin.auth.admin.updateUserById(traineeId, { password });
        check(error);
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { invited_trainee: true },
          user_metadata: { name },
        });
        if (error || !data.user) {
          const duplicate =
            error?.code === "email_exists" ||
            error?.status === 422 ||
            /already|registered|exists/i.test(error?.message ?? "");
          if (duplicate) fail("This email is already registered in Supabase Auth.");
          fail("Could not create the invitation. Please check the email and try again.");
        }
        traineeId = data.user!.id;
      }
      const now = new Date().toISOString();
      const invitedProfile = {
        id: traineeId,
        practice_id: profile.practice_id,
        role: "trainee",
        name,
        email,
        job_role: String(body.role ?? ""),
        must_reset_password: true,
        invited_at: now,
        last_invite_at: now,
        invite_status: "pending",
      };
      // Updating an existing invitation must never clear a concurrent deactivation.
      const { error: insertError } = existing
        ? await admin.from("profiles").update(invitedProfile).eq("id", traineeId)
        : await admin.from("profiles").upsert(invitedProfile);
      if (insertError) {
        if (!existing) await admin.auth.admin.deleteUser(traineeId);
        fail("Could not save the invitation. Please try again.");
      }
      const induction = (state.packages ?? []).find(
        (p: { kind?: string }) => p.kind === "induction",
      );
      const inductionModuleIds = new Set(
        (induction?.moduleIds ?? []).filter((moduleId: string) =>
          modules.some((m) => m.id === moduleId && m.published && !m.needsReview),
        ),
      );
      if (induction && inductionModuleIds.size) {
        const assignments = [...(state.assignments ?? [])];
        for (const moduleId of inductionModuleIds) {
          if (!assignments.some((a) => a.traineeId === traineeId && a.moduleId === moduleId)) {
            assignments.push({
              id: crypto.randomUUID(),
              traineeId,
              moduleId,
              packageId: induction.id,
              assignedAt: Date.now(),
              status: "assigned",
            });
          }
        }
        const nextState = { ...state, assignments };
        const { data: savedPractice, error: assignmentError } = await admin
          .from("practices")
          .update({ state: nextState, version: practice.version + 1 })
          .eq("id", practice.id)
          .eq("version", practice.version)
          .select("version")
          .maybeSingle();
        check(assignmentError);
        if (!savedPractice) fail("The practice changed while the invitation was being created.");
        practice.version = savedPractice.version;
        state.assignments = assignments;
      }
      const loginUrl = new URL("/auth", appUrl);
      loginUrl.searchParams.set("practice", practice.id);
      loginUrl.searchParams.set("email", email);
      const practiceName = String((await loadPracticeData())?.practiceName || "your GP practice");
      let sent = false;
      let deliveryMessage = "The invitation email could not be sent.";
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `invite-${traineeId}-${now}`,
          },
          body: JSON.stringify({
            from,
            to: [email],
            subject: `Your PracticeReady invitation — ${practiceName}`,
            html: `<h1>Welcome to PracticeReady</h1><p>Hello ${escapeHtml(name)},</p><p>${escapeHtml(practiceName)} has invited you to your practice training.</p><p><a href="${escapeHtml(loginUrl.toString())}">Log in to PracticeReady</a></p><p>Username: ${escapeHtml(email)}</p><p>Temporary password: <strong>${escapeHtml(password)}</strong></p><p>Log in within 7 days. You must choose a new password before accessing training.</p>`,
            text: `Hello ${name},\n${practiceName} has invited you to PracticeReady.\n${loginUrl}\nUsername: ${email}\nTemporary password: ${password}\nLog in within 7 days and choose a new password before training.`,
          }),
          signal: AbortSignal.timeout(15000),
        });
        sent = response.ok;
        if (!sent) {
          const provider = await response.json().catch(() => null);
          const message = provider && typeof provider.message === "string" ? provider.message : "";
          if (message) deliveryMessage = `The invitation email could not be sent: ${message}`;
        }
      } catch {
        /* Keep the invited account so the manager can resend. */
      }
      const { error: deliveryError } = await admin
        .from("profiles")
        .update({ invite_status: sent ? "sent" : "failed" })
        .eq("id", traineeId);
      check(deliveryError);
      if (!sent) fail(`${deliveryMessage} Please check the address or try again later.`);
      return reply({ ok: true });
    }

    if (action === "remove-trainee") {
      if (!manager) return reply({ error: "Manager access required." }, 403);
      return reply(
        { error: "Staff removal has been replaced by Deactivate. No history was deleted." },
        400,
      );
    }
    if (action === "set-staff-active") {
      if (!manager) return reply({ error: "Manager access required." }, 403);
      if (typeof body.active !== "boolean" || typeof body.id !== "string")
        fail("Choose a staff member and action.");
      const { data: member, error: memberError } = await admin
        .from("profiles")
        .select("id")
        .eq("id", body.id)
        .eq("practice_id", profile.practice_id)
        .eq("role", "trainee")
        .maybeSingle();
      check(memberError);
      if (!member) fail("Staff member not found.");
      const { data: saved, error } = await admin.rpc("set_staff_active", {
        p_manager: profile.id,
        p_trainee: body.id,
        p_active: body.active,
        p_version: practice.version,
      });
      check(error);
      if (saved === null)
        return reply({ error: "The practice changed. Reload and try again." }, 409);
      return reply({ ok: true });
    }

    if (action === "delete-practice") {
      if (!manager) return reply({ error: "Manager access required." }, 403);
      if (body.confirm !== "DELETE") fail("Type DELETE to confirm.");
      const { data: members, error: membersError } = await admin
        .from("profiles")
        .select("id")
        .eq("practice_id", practice.id);
      check(membersError);
      // Deleting auth users cascades to profiles and training_sessions; profiles must go before the practice.
      for (const m of members ?? []) check((await admin.auth.admin.deleteUser(m.id)).error);
      check((await admin.from("practices").delete().eq("id", practice.id)).error);
      return reply({ ok: true });
    }

    if (manager) return reply({ error: "Use a trainee account to record training." }, 403);
    const assignment = assignments.find(
      (a) => a.id === body.assignmentId && a.traineeId === profile.id && !a.withdrawnAt,
    );
    if (!assignment) return reply({ error: "This module is not assigned to you." }, 403);
    const module = modules.find(
      (m) => m.id === assignment.moduleId && m.published && !m.needsReview,
    );
    if (!module) fail("This module is awaiting manager review.");
    const { data: rows, error: rowsError } = await admin
      .from("training_sessions")
      .select("*")
      .eq("practice_id", practice.id)
      .eq("trainee_id", profile.id)
      .eq("assignment_id", assignment.id);
    check(rowsError);
    if (action === "start") {
      const open = rows?.find((r) => resumableAttempt(r.data, module));
      if (open) return reply({ session: open.data });
      for (const old of rows ?? []) {
        if (old.data.result || old.data.supersededAt) continue;
        const { data: archived, error: archiveError } = await admin
          .from("training_sessions")
          .update({ data: { ...old.data, supersededAt: Date.now() }, version: old.version + 1 })
          .eq("id", old.id)
          .eq("version", old.version)
          .select("id")
          .maybeSingle();
        check(archiveError);
        if (!archived) fail("Your progress changed on another device. Reload to continue.");
      }
      const session = startSession(module, assignment, crypto.randomUUID());
      const { error } = await admin.from("training_sessions").insert({
        id: session.id,
        practice_id: practice.id,
        trainee_id: profile.id,
        assignment_id: assignment.id,
        data: session,
      });
      if (error?.code === "23505")
        fail("An attempt was just started on another device. Reload to continue it.");
      check(error);
      return reply({ session });
    }
    const row = rows?.find((r) => r.id === body.sessionId);
    if (!row) fail("Training attempt not found. Reload your training.");
    let session = row.data as TrainingSession;
    if (!session.result && !resumableAttempt(session, module))
      fail(
        "Your training has been updated. Return to your training and start the updated module. Your earlier answers are kept.",
      );
    if (action === "answer") {
      if (session.queue[session.index] !== body.scenarioId)
        fail("Your progress changed on another device. Reload to continue.");
      session = answerSession(session, body.value);
    } else if (action === "continue") {
      if (!session.result && session.queue[session.index] !== body.scenarioId)
        fail("Your progress changed on another device. Reload to continue.");
      session = advanceSession(session, module.title);
      if (session.result) session.result.traineeName = profile.name;
    } else if (action === "previous") {
      if (!session.result && session.queue[session.index] !== body.scenarioId)
        fail("Your progress changed on another device. Reload to continue.");
      session = previousSession(session);
    } else if (action === "submit") {
      session = submitSession(session, module.title);
      if (session.result) session.result.traineeName = profile.name;
    } else if (action === "confidence") {
      if (!session.result || !Number.isInteger(body.value) || body.value < 1 || body.value > 5)
        fail("Choose a confidence from 1 to 5.");
      session = { ...session, result: { ...session.result!, confidence: body.value } };
    } else fail("Unknown action.");
    const { data: saved, error } = await admin
      .from("training_sessions")
      .update({ data: session, version: row.version + 1 })
      .eq("id", row.id)
      .eq("version", row.version)
      .select("id")
      .maybeSingle();
    check(error);
    if (!saved)
      return reply({ error: "Your progress changed on another device. Reload to continue." }, 409);
    return reply({ session });
  } catch (error) {
    // Credentials and provider payloads must never be logged.
    return reply(
      {
        error: error instanceof UserError ? error.message : "The request failed. Please try again.",
      },
      400,
    );
  }
});
