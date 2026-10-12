import type { PracticeData } from "../../src/lib/store.ts";
import { suggestedRole, requestCategories } from "../../src/lib/role-requests.ts";

// Fictional test mappings, never production defaults or clinical guidance.
export const empty = (): PracticeData => ({
  practiceName: "Test Practice",
  hours: "",
  address: "",
  outOfHoursTimes: "",
  sameDayReasons: [],
  prescriptionOrdering: "",
  dutyContact: "",
  nominatedPharmacy: "",
  urgentNumbers: "",
  extras: "",
  repeatOrderMethods: "",
  repeatTurnaround: "",
  repeatControlled: "",
  repeatHighRisk: "",
  repeatEmergency: "",
  localSafeguarding: "",
  localComplaints: "",
  localDNA: "",
  localInterpreter: "",
  localConfidentiality: "",
  staff: [],
  rolePolicies: {
    gpsSameDay: "",
    gpsRoutine: "",
    npsSameDay: "",
    npsRoutine: "",
    nursesSameDay: "",
    nursesRoutine: "",
    hcasSameDay: "",
    hcasRoutine: "",
    pharmacistsSameDay: "",
    pharmacistsRoutine: "",
    neverPromise: "",
    phrasesUse: "",
    phrasesAvoid: "",
  },
});

const ids = requestCategories.flatMap((c) => c.requests).map((r) => r.id);
export function practice(groups: number[][] = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11], [0]]) {
  const roles = groups.map((indices, i) => ({
    ...suggestedRole(`Test role ${i + 1}`),
    confirmed: true,
    selectedRequestIds: indices.map((index) => ids[index]),
  }));
  return {
    ...empty(),
    practiceName: "Test practice",
    staff: [],
    roleRequests: Object.fromEntries(roles.map((r) => [r.roleId, r])),
  } as PracticeData;
}
