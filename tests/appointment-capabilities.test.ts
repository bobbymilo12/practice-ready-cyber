import assert from "node:assert/strict";
import {
  canHandleAppointment,
  clinicianCapabilities,
  initialiseCapabilities,
  isClinicalStaff,
  roleCapabilities,
} from "../src/lib/appointment-capabilities.ts";

const alex = initialiseCapabilities({ role: "Nurse Practitioner" });
const robin = initialiseCapabilities({ role: "Nurse Practitioner" });
const changed = {
  ...alex,
  appointmentCapabilities: {
    defaults: roleCapabilities(alex.role),
    overrides: { "breast-examination": false },
  },
};
assert.equal(canHandleAppointment(changed, "breast-examination"), false);
assert.equal(canHandleAppointment(robin, "breast-examination"), true);
assert.equal(
  canHandleAppointment(JSON.parse(JSON.stringify(changed)), "breast-examination"),
  false,
);
assert.equal(roleCapabilities("HCA")["cervical-screening"], false);
assert.equal(roleCapabilities("Doctor (GP)")["minor-illness"], true);
assert.equal(roleCapabilities("Practice Nurse")["blood-test"], true);
assert.equal(isClinicalStaff({ role: "Reception" }), false);
const legacyCustom = { role: "Custom clinician", isClinical: true };
assert.equal(isClinicalStaff(legacyCustom), false);
const legacyNurse = { ...robin, isClinical: false };
assert.equal(canHandleAppointment(legacyNurse, "blood-test"), true);
assert.equal(
  roleCapabilities(
    "HCA",
    { hca: { "blood-test": false, "asthma-review": true } },
    { hca: { "asthma-review": false } },
  )["asthma-review"],
  false,
);
assert.equal(roleCapabilities("HCA", { hca: { "blood-test": false } })["blood-test"], false);
assert.equal(clinicianCapabilities({ role: "Unknown" })["blood-test"], false);
assert.equal(
  clinicianCapabilities({ role: "GP", appointmentCapabilities: { defaults: {}, overrides: {} } })[
    "minor-illness"
  ],
  undefined,
);
console.log("Appointment capability defaults, overrides and compatibility passed");
