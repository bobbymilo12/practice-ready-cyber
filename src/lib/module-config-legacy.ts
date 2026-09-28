// Previously offered choices: retained only when already selected, never suggested to new modules.
export const legacyModuleOptions: Record<string, Record<string, string[]>> = {
  "appointment-booking": {
    sameDay: [
      "Reception books directly with an appropriate clinician",
      "Request goes through triage first",
      "It depends on the request",
    ],
    sameDayRoutes: [
      "Direct booking where the recorded request rules permit it",
      "Clinical triage before booking",
      "Request sent to the responsible team for a decision",
    ],
    preference: [
      "Check that clinician’s recorded responsibilities and availability before offering an appointment",
      "Send the preference to the booking team for review",
      "It depends on whether the request is routine or same-day",
    ],
    preferenceRoutes: [
      "Discuss another clinician who is recorded as handling the request",
      "Ask the responsible team to review the request before making an offer",
    ],
    unavailable: [
      "Refer to the saved appointment escalation route",
      "Send a request to the booking team for review",
    ],
    uncertain: ["Refer to the saved appointment escalation route"],
    appointmentMode: [
      "Check the recorded booking instruction before changing the appointment mode",
      "Ask the responsible clinician or team to confirm the appointment mode",
    ],
    cancellation: [
      "Release the slot and offer rebooking under the saved booking process",
      "Send a rebooking request to the booking team",
    ],
  },
  prescriptions: {
    acute: ["NHS App", "Practice website / online form", "Telephone", "At reception"],
    monitoring: [
      "Send the request for clinician review",
      "Use the recorded medication monitoring process",
    ],
    urgentRequest: [
      "Refer to the saved appointment escalation route",
      "Send an urgent clinical-system request to the prescription team",
    ],
    chasing: [
      "Check the request status and send a query to the prescription team",
      "Ask the responsible clinician to review the outstanding request",
    ],
    pharmacyIssue: [
      "Check the recorded prescription destination and status before referring the query",
      "Send the query to the prescription team for investigation",
    ],
  },
  urgent: {
    record: ["Clinical system urgent task", "Practice urgent-call template"],
    handover: [
      "Patient identifiers",
      "Callback number",
      "Caller’s own description of the concern",
      "Actions already taken and the time of the call",
    ],
    acknowledgement: [
      "Seek acknowledgement from the receiving team",
      "Check the clinical-system task acknowledgement",
    ],
  },
  results: {
    release: [
      "Only when marked as reviewed and authorised for reception to share",
      "All result enquiries go to the reviewing clinician",
    ],
    pending: [
      "Send a task to the reviewing clinician",
      "Refer to the saved appointment escalation route",
    ],
    identity: ["Full name and date of birth", "Full name, date of birth and address"],
    followup: [
      "Arrange the follow-up exactly as recorded by the reviewing clinician",
      "Pass the instruction to the booking team to arrange",
    ],
    notReceived: [
      "Send a query to the results team",
      "Ask the requesting clinician to review the missing-result enquiry",
    ],
  },
  vaccines: {
    eligibility: [
      "Check the recorded clinician invitation",
      "Ask the vaccination team to confirm before booking",
    ],
    unclear: [
      "Refer to the saved appointment escalation route",
      "Send a query to the vaccination team",
    ],
    clinicFull: [
      "Send the request to the vaccination team to arrange capacity",
      "Use the practice’s vaccination waiting list",
    ],
    waitingList: [
      "Patient identifiers",
      "Contact number",
      "Recorded vaccine invitation",
      "Patient availability",
    ],
    vaccineAdvice: [
      "Send the question to the vaccination team",
      "Ask the clinician named in the booking instruction to respond",
    ],
  },
  "fit-notes": {
    request: ["NHS App", "Practice website / online form", "Telephone", "At reception"],
    delivery: [
      "Secure digital message",
      "Paper collection under the saved confidentiality procedure",
      "Patient chooses secure digital message or paper collection",
    ],
    extension: [
      "Send to the responsible clinician for a decision",
      "Use the same request pathway as a new fit note",
    ],
    fitNoteChase: [
      "Check the request status and send a query to the responsible team",
      "Refer the enquiry to the clinician reviewing the request",
    ],
  },
  "home-visits": {
    intake: ["Clinical system home visit task", "Practice home visit request template"],
    late: [
      "Refer to the saved appointment escalation route",
      "Send to the home visit reviewer for a decision",
    ],
    visitDetails: [
      "Patient identifiers",
      "Current location and access information",
      "Callback number",
      "Caller’s description of the reason for the request",
    ],
    visitUpdate: [
      "Send the update to the home visit reviewer",
      "Refer to the saved appointment escalation route",
    ],
  },
  difficult: {
    complaint: [
      "Send the complaint to the practice manager",
      "Provide the practice complaint form",
    ],
    record: ["Practice incident reporting system", "Clinical system incident template"],
    phrasing: [
      "Acknowledge the concern and explain the next available step",
      "Offer to involve the named support contact",
    ],
    unresolved: [
      "Request a callback from the named support contact",
      "Pass a written handover to the practice manager",
    ],
    incidentDetails: [
      "Date and time",
      "Caller’s own words where relevant",
      "Actions taken",
      "Team member notified",
    ],
  },
  "first-week": {
    supervision: [
      "Buddy observes and confirms readiness",
      "Practice manager confirms readiness after shadowing",
    ],
    shadowing: [
      "Appointment requests",
      "Prescription requests",
      "Results enquiries",
      "Administrative handovers",
    ],
    accessIssue: [
      "Ask their named buddy to raise an access request",
      "Contact the practice’s system administrator",
    ],
  },
};
