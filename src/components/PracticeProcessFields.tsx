import { ConfirmedItems } from "./ConfirmedItems";
import { SameDayRequests } from "./SameDayRequests";
import { EscalationContacts } from "./EscalationContacts";
import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { useApp, type PracticeData } from "@/lib/store";
import {
  bookingFor,
  prescriptionsFor,
  prescriptionInstructions,
  sameDayProcesses,
  routineProcesses,
  prescriptionMethods,
  contactMethods,
  contactRoles,
  turnarounds,
  calendarRules,
  urgentActions,
  switchUrgentRoute,
  routeText,
  type Option,
  type Choice,
  type ContactRoute,
} from "@/lib/practice-config";
const field = "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";
export function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input className={field} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
export function Instruction({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-primary">
        {value.trim()
          ? "Edit practice-specific instructions"
          : "+ Add practice-specific instructions"}
        <span className="sr-only">: {label}</span>
      </summary>
      <label className="mt-3 block">
        {label}
        <textarea
          aria-label={label}
          rows={2}
          className={field}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </details>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
function Multi({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 font-medium">{label}</legend>
      {options.map((o) => (
        <Check
          key={o.id}
          label={o.label}
          checked={value.includes(o.id)}
          onChange={(checked) =>
            onChange(checked ? [...value, o.id] : value.filter((id) => id !== o.id))
          }
        />
      ))}
    </fieldset>
  );
}
export function SelectChoice({
  label,
  options,
  value,
  onChange,
  radio = false,
}: {
  label: string;
  options: Option[];
  value: Choice;
  onChange: (v: Choice) => void;
  radio?: boolean;
}) {
  const name = useId();
  return (
    <div className="space-y-3">
      {radio ? (
        <fieldset className="space-y-3">
          <legend className="mb-3 font-medium">{label}</legend>
          {options.map((o) => (
            <label key={o.id} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name={name}
                className="mt-0.5 accent-primary"
                checked={value.id === o.id}
                onChange={() => onChange({ ...value, id: o.id })}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      ) : (
        <label className="block text-sm font-medium">
          {label}
          <select
            aria-label={label}
            className={field}
            value={value.id}
            onChange={(e) => onChange({ ...value, id: e.target.value })}
          >
            <option value="">Choose an option</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {value.id === "other" && (
        <Text
          label={`${label} — other`}
          value={value.other}
          onChange={(other) => onChange({ ...value, other })}
        />
      )}
    </div>
  );
}
export function ContactFields({
  label,
  value,
  onChange,
  practice,
  multiple = false,
}: {
  label: string;
  value: ContactRoute;
  onChange: (v: ContactRoute) => void;
  practice: PracticeData;
  multiple?: boolean;
}) {
  const c = value.contact;
  const selected =
    c.kind === "staff" ? `staff:${c.staffId}` : c.kind === "role" ? `role:${c.role}` : c.kind;
  const roles = [
    ...new Set([
      ...contactRoles,
      ...practice.staff.map((s) => s.role).filter(Boolean),
      ...(c.kind === "role" ? [c.role] : []),
    ]),
  ];
  return (
    <div className="space-y-4">
      {multiple || c.kind === "multiple" ? (
        <EscalationContacts label={label} value={value} practice={practice} onChange={onChange} />
      ) : (
        <>
          <label className="block font-medium text-sm">
            {label}
            <select
              aria-label={label}
              className={field}
              value={selected}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...value,
                  contact: v.startsWith("staff:")
                    ? { kind: "staff", staffId: v.slice(6) }
                    : v.startsWith("role:")
                      ? { kind: "role", role: v.slice(5) }
                      : v === "other"
                        ? { kind: "other", text: "" }
                        : { kind: "unconfirmed" },
                });
              }}
            >
              <option value="unconfirmed">Choose a contact</option>
              {roles.map((role) => (
                <option key={role} value={`role:${role}`}>
                  {role}
                </option>
              ))}
              {practice.staff
                .filter((s) => s.name.trim())
                .map((s) => (
                  <option key={s.id} value={`staff:${s.id}`}>
                    {s.name} — {s.role}
                  </option>
                ))}
              {c.kind === "staff" && !practice.staff.some((s) => s.id === c.staffId) && (
                <option value={selected}>Team member removed — choose another contact</option>
              )}
              <option value="other">Other</option>
            </select>
          </label>
          {c.kind === "other" && (
            <ConfirmedItems
              label="Other contact"
              single
              items={c.text.trim() ? [c.text] : []}
              onChange={(items) =>
                onChange({ ...value, contact: { kind: "other", text: items[0] ?? "" } })
              }
            />
          )}
        </>
      )}
      <SelectChoice
        label="How should reception contact them?"
        options={contactMethods}
        value={value.method}
        onChange={(method) => onChange({ ...value, method })}
      />
      {value.method.id === "phone" && (
        <Text
          label="Phone / extension number"
          value={value.method.other}
          onChange={(other) => onChange({ ...value, method: { ...value.method, other } })}
        />
      )}
      <Instruction
        label="Contact instructions (including existing guidance)"
        value={value.instruction}
        onChange={(instruction) => onChange({ ...value, instruction })}
      />
    </div>
  );
}
export function BookingFields() {
  const p = useApp((s) => s.practiceData),
    set = useApp((s) => s.setBookingConfig);
  const b = bookingFor(p);
  return (
    <div className="space-y-8">
      <Multi
        label="How can patients request appointments?"
        options={[
          { id: "phone", label: "Telephone" },
          { id: "online", label: "Practice website / online form" },
          { id: "nhs-app", label: "NHS App" },
          { id: "reception", label: "At reception" },
          { id: "other", label: "Other" },
        ]}
        value={b.requestMethods ?? []}
        onChange={(requestMethods) => set({ ...b, requestMethods })}
      />
      {b.requestMethods?.includes("other") && (
        <Text
          label="Other appointment request method"
          value={b.otherRequestMethod ?? ""}
          onChange={(otherRequestMethod) => set({ ...b, otherRequestMethod })}
        />
      )}
      <section className="space-y-4">
        <h2 className="font-semibold">
          Which requests may be eligible for a same-day appointment?
        </h2>
        <p className="text-sm text-muted-foreground">
          Select the requests your practice considers for same-day appointments.
        </p>
        <SameDayRequests />
        <Instruction
          label="Same-day criteria instructions (including existing guidance)"
          value={b.sameDayPathway.instruction}
          onChange={(instruction) =>
            set({ ...b, sameDayPathway: { ...b.sameDayPathway, instruction } })
          }
        />
      </section>
      <SelectChoice
        radio
        label="How are same-day requests normally handled?"
        options={sameDayProcesses}
        value={b.sameDayProcess}
        onChange={(sameDayProcess) => set({ ...b, sameDayProcess })}
      />
      <Check
        label="If reception is unsure, send to duty clinician"
        checked={b.sendUncertainToDutyClinician}
        onChange={(sendUncertainToDutyClinician) => set({ ...b, sendUncertainToDutyClinician })}
      />
      <Instruction
        label="Same-day process instructions (including existing guidance)"
        value={b.sameDayInstruction}
        onChange={(sameDayInstruction) => set({ ...b, sameDayInstruction })}
      />
      <ContactFields
        multiple
        label="Who should reception contact when they are unsure?"
        value={b.escalation}
        practice={p}
        onChange={(escalation) => set({ ...b, escalation })}
      />
      <SelectChoice
        radio
        label="How are routine appointment requests normally handled?"
        options={routineProcesses}
        value={b.routineProcess}
        onChange={(routineProcess) => set({ ...b, routineProcess })}
      />
      <Instruction
        label="Routine booking instructions (including existing guidance)"
        value={b.routineInstruction}
        onChange={(routineInstruction) => set({ ...b, routineInstruction })}
      />
      <Link className="inline-block text-sm text-primary" to="/practice/setup" search={{ step: 1 }}>
        Review what each role handles in Roles →
      </Link>
    </div>
  );
}
export function PrescriptionFields() {
  const p = useApp((s) => s.practiceData),
    set = useApp((s) => s.setPrescriptionConfig);
  const c = prescriptionsFor(p);
  return (
    <div className="space-y-6">
      <Multi
        label="How can patients request repeat prescriptions?"
        options={prescriptionMethods}
        value={c.methods}
        onChange={(methods) => set({ ...c, methods })}
      />
      {c.methods.includes("other") && (
        <Text
          label="Other prescription request method"
          value={c.otherMethod}
          onChange={(otherMethod) => set({ ...c, otherMethod })}
        />
      )}
      <ConfirmedItems
        label="Practice-specific prescription instructions"
        items={prescriptionInstructions(c)}
        onChange={(orderingInstructions) =>
          set({ ...c, orderingInstructions, orderingInstruction: orderingInstructions.join("\n") })
        }
      />
      <SelectChoice
        radio
        label="What is the usual repeat prescription turnaround?"
        options={turnarounds}
        value={c.turnaround}
        onChange={(turnaround) => set({ ...c, turnaround })}
      />
      <details>
        <summary className="cursor-pointer text-sm">More turnaround settings (optional)</summary>
        <div className="mt-4 space-y-4">
          {" "}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectChoice
              label="Weekends"
              options={calendarRules}
              value={c.weekends}
              onChange={(weekends) => set({ ...c, weekends })}
            />
            <SelectChoice
              label="Bank holidays"
              options={calendarRules}
              value={c.bankHolidays}
              onChange={(bankHolidays) => set({ ...c, bankHolidays })}
            />
          </div>
          <Instruction
            label="Turnaround instructions (including existing guidance)"
            value={c.turnaroundInstruction}
            onChange={(turnaroundInstruction) => set({ ...c, turnaroundInstruction })}
          />
        </div>
      </details>
      <h2 className="font-semibold">Who handles urgent prescription requests?</h2>
      <Check
        label="Use the same contact and method as appointment escalation"
        checked={c.urgentRoute.source === "appointment"}
        onChange={(same) =>
          set({
            ...c,
            urgentRoute: switchUrgentRoute(c.urgentRoute, same),
          })
        }
      />
      {c.urgentRoute.source === "appointment" ? (
        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {routeText(bookingFor(p).escalation, p) ||
            "Choose the appointment escalation contact and method in Bookings."}
          <Link to="/practice/setup" search={{ step: 3 }} className="mt-2 block text-primary">
            Review appointment escalation →
          </Link>
        </p>
      ) : (
        <ContactFields
          label="Urgent prescription contact"
          practice={p}
          value={c.urgentRoute.route}
          onChange={(route) => set({ ...c, urgentRoute: { source: "separate", route } })}
        />
      )}
      <Multi
        label="What should reception normally do?"
        options={urgentActions}
        value={c.urgentActions}
        onChange={(urgentActions) => set({ ...c, urgentActions })}
      />
      {c.urgentActions.includes("other") && (
        <Text
          label="Other urgent prescription process"
          value={c.otherAction}
          onChange={(otherAction) => set({ ...c, otherAction })}
        />
      )}
      <Instruction
        label="Urgent prescription instructions (including existing guidance)"
        value={c.urgentInstruction}
        onChange={(urgentInstruction) => set({ ...c, urgentInstruction })}
      />
    </div>
  );
}
