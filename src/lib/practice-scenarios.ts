import { practiceSummary } from "./practice-config.ts";
import { requestRoleId, effectiveRequestsForStaff } from "./role-requests.ts";
import type { PracticeData, Scenario } from "./store";

// Local rules are quoted verbatim. Both situations remain drafts until reviewed.
export function practiceScenarios(
  topic: string,
  title: string,
  practice: PracticeData,
  answers: Record<string, string>,
): Scenario[] {
  practice = practiceSummary(practice);
  if (practice.bookingConfig) {
    answers = { ...answers };
    delete answers.sameDayProcess;
    delete answers.dutyTeam;
  }
  const rules: { title: string; rule: string; quotes: [string, string] }[] = [];
  const add = (name: string, rule: string | undefined, first: string, second: string) => {
    if (rule?.trim()) rules.push({ title: name, rule: rule.trim(), quotes: [first, second] });
  };
  if (topic === "prescriptions") {
    add(
      "Ordering a repeat prescription",
      practice.prescriptionOrdering || practice.repeatOrderMethods,
      "How do I request my next repeat prescription?",
      "My usual way of requesting a repeat has changed. How should I send this request?",
    );
    add(
      "Prescription turnaround",
      practice.repeatTurnaround,
      "I've requested my prescription. When should I expect it?",
      "I sent my request before the weekend and I'm checking when it will be ready.",
    );
    add(
      "Medication has run out",
      practice.repeatEmergency,
      "I've run out of my usual medication. What happens next?",
      "The pharmacy says there is no prescription waiting, and I've taken my last dose.",
    );
    add(
      "Controlled drug requests",
      practice.repeatControlled,
      "I want to request a repeat of my controlled medication.",
      "I'm calling ahead about my next controlled medication prescription. What is the process?",
    );
    add(
      "Medication monitoring",
      practice.repeatHighRisk,
      "Can you check how my medication request will be reviewed?",
      "My medication needs monitoring. Can reception send the request through the usual route?",
    );
  } else if (topic === "first-week") {
    add(
      "Safeguarding concerns",
      practice.localSafeguarding,
      "A caller shares something that raises a safeguarding concern. What is the local process?",
      "A colleague is unsure how to raise a safeguarding concern. Who should they contact?",
    );
    add(
      "Confidentiality",
      practice.localConfidentiality,
      "Someone asks reception for another patient's information.",
      "A caller wants to collect information on behalf of a relative.",
    );
    add(
      "Opening hours",
      practice.hours,
      "When is your practice open?",
      "I need to plan a visit to reception. What are the opening hours?",
    );
    add(
      "Outside normal hours",
      practice.outOfHoursTimes,
      "Where should I seek help when you are closed?",
      "What is the local process outside opening hours?",
    );
  } else if (topic === "results") {
    add(
      "Protecting confidential information",
      practice.localConfidentiality,
      "Can you tell me my partner's results?",
      "My parent asked me to collect some information about their results. Can you give it to me?",
    );
  } else if (topic === "urgent") {
    add(
      "Local escalation route",
      answers.dutyTeam || practice.dutyContact,
      "I need urgent help and I'm not sure who to speak to.",
      "A colleague has handed over an urgent call. Which local team should be alerted?",
    );
    add(
      "Considering the same-day pathway",
      practice.sameDayReasons.join("\n"),
      "Could this request need help today?",
      "A caller's situation has changed since their earlier call. How do you check the same-day criteria?",
    );
  } else {
    add(
      "Same-day requests",
      answers.sameDayProcess || practice.rolePolicies.gpsSameDay,
      "I need an appointment today. How can you help?",
      "I called earlier about an appointment and still need help today. What happens next?",
    );
    add(
      "Routine appointments",
      practice.rolePolicies.gpsRoutine,
      "I'd like to arrange a routine appointment.",
      "I need to rearrange a planned appointment. Which local booking rules apply?",
    );
    add(
      "Outside normal hours",
      practice.outOfHoursTimes,
      "What happens if I need help when you are closed?",
      "I'm planning ahead for the weekend. Where can I find help outside your opening hours?",
    );
  }
  for (const [key, value] of Object.entries(answers)) {
    add(
      `${title}: ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`,
      value,
      `I have a question about ${title.toLowerCase()}. Can you explain the practice's process?`,
      `I'm following up on an earlier conversation about ${title.toLowerCase()}. How should this be handled locally?`,
    );
  }
  for (const person of practice.staff) {
    const role = practice.roleRequests?.[requestRoleId(person.role)];
    // A saved role is the authority for all its employees. Never infer scope from old defaults.
    // Older practices without role configuration retain their recorded individual guidance.
    const tasks = (
      role
        ? effectiveRequestsForStaff(practice, person.id).map((r) => r.label)
        : [person.clinics, ...(person.capabilities ?? [])]
    )
      .filter(Boolean)
      .join("; ");
    if (tasks)
      add(
        `Working with ${person.name}`,
        `${person.name} (${person.role}) covers: ${tasks}. Check the local booking rules and availability before confirming.`,
        `I was told ${person.name} might handle my request. What do they cover?`,
        `A colleague suggests routing this request to ${person.name}. How do you check that this matches their role?`,
      );
  }
  add(
    "When you are unsure",
    practice.dutyContact,
    "I'm not sure whether this is the right team for my request.",
    "You cannot find a clear route for a patient's request. Who should you contact locally?",
  );
  add(
    "Confidentiality at reception",
    practice.localConfidentiality,
    "Could you give me information about someone else registered here?",
    "Someone at the reception desk asks you to confirm another patient's details.",
  );
  if (!rules.length)
    add(
      "Ask for local guidance",
      "Ask your practice manager to confirm the local process before acting or making promises.",
      "Can you explain how this works at your practice?",
      "A colleague gives you instructions you cannot verify in the practice protocol. What should you do?",
    );
  const seen = new Set<string>();
  return rules
    .filter((r) => {
      if (seen.has(r.rule)) return false;
      seen.add(r.rule);
      return true;
    })
    .flatMap((r) => {
      const id = crypto.randomUUID();
      return r.quotes.map((quote, i): Scenario => ({
        kind: "mcq",
        id: i ? crypto.randomUUID() : id,
        followUpFor: i ? id : undefined,
        title: `${r.title}${i ? " — another situation" : ""}`,
        patientQuote: quote,
        question: `Which response follows the information recorded by ${practice.practiceName || "your practice"}?`,
        options: [
          "Use the process from a previous workplace without checking local guidance.",
          r.rule,
          "Promise that the request will be resolved immediately before checking the local process.",
          "Ask the patient to try again later without clarifying the request or seeking support.",
        ],
        correctIndex: 1,
        learningPoint: `The recorded local guidance is: ${r.rule}\nUse this guidance to choose the appropriate next step; guessing or making a promise before checking can send the request to the wrong place.`,
        status: "draft",
      }));
    });
}
