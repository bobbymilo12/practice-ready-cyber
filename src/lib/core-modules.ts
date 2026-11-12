import type { MCQScenario, Module } from "./training-types.ts";

// All senders, companies and domains below are fictional, except nhs.net used for the genuine example.
const core = { status: "approved", provenance: { kind: "core" } } as const;
const mcq = (s: Omit<MCQScenario, "kind" | "status" | "provenance">): MCQScenario => ({
  kind: "mcq",
  ...core,
  ...s,
});

const phishingEmail: Module = {
  id: "core-phishing-email",
  core: true,
  type: "Cyber security",
  title: "Phishing & email safety",
  topicKey: "phishing-email",
  published: true,
  difficulty: "intermediate",
  length: "medium",
  createdAt: Date.UTC(2026, 10, 12),
  scenarios: [
    mcq({
      id: "phish-mailbox-full",
      title: "Mailbox full warning",
      patientQuote: "",
      email: {
        from: "Mail Admin <mailadmin.helpdesk2026@freemail-box.com>",
        subject: "URGENT!! Your Mailbox is Full - Action Required",
        body: "Dear User,\n\nYour mailbox has exceeded it's storage limit. You will not recieve new emails untill you verify your account.\n\nClick here to verify within 1 hour or your account will be DELETED:\nhttp://mailbox-verify-now.info/login\n\nMail Administrator Team",
      },
      question: "What should you do with this email?",
      options: [
        "Click the link quickly so you don't lose access to your emails",
        "Reply asking whether it is genuine",
        "Don't click the link; report it as phishing and delete it",
        "Forward it to colleagues to warn them",
      ],
      correctIndex: 2,
      learningPoint:
        "Free-mail sender, spelling mistakes, a generic greeting and a short deadline are classic phishing signs. Never click to 'verify' an account from an email: report it through your organisation's phishing route and delete it.",
    }),
    mcq({
      id: "phish-password-expiry",
      title: "Password expiry notice",
      patientQuote: "",
      email: {
        from: "NHSmail Support <no-reply@nhsmail-securedesk.co>",
        subject: "Your password expires today",
        body: "Hello,\n\nOur records show the password for your account expires today. To keep access to email and clinical systems, please confirm your current password.\n\nKeep my password → https://nhsmail-securedesk.co/keep-password\n\nAccounts not updated within 24 hours will be suspended.\n\nNHSmail Support",
      },
      question: "Select every warning sign in this email.",
      options: [
        "The sender's domain is not nhs.net",
        "It uses a generic greeting instead of your name",
        "It asks you to confirm your current password through a link",
        "It threatens to suspend your account within 24 hours",
        "It mentions NHSmail",
        "It arrived during working hours",
      ],
      correctIndex: 0,
      correctIndices: [0, 1, 2, 3],
      learningPoint:
        "Look at the real sender address, not the display name. A lookalike domain, a generic greeting, a request for your password and pressure to act fast are all warning signs. Mentioning a real service or arriving during the working day proves nothing.",
    }),
    mcq({
      id: "phish-shared-document",
      title: "Shared document from a partner practice",
      patientQuote: "",
      email: {
        from: "Rachel Moore <rachel.moore@nhs.net>",
        subject: "Updated PCN cover rota",
        body: "Hi,\n\nAs discussed at the PCN meeting, here's the updated cover rota and referral contacts for next month. It's been shared securely so you'll need to sign in with your NHSmail account to view it.\n\nOpen document → https://pcn-docs-share.com/view?id=88213\n\nThanks,\nRachel\nPractice Manager, Riverside Surgery",
      },
      question:
        "You know Rachel from PCN meetings and the address is a genuine nhs.net account. What is the safest next step?",
      options: [
        "Open it, because it comes from a real nhs.net address you recognise",
        "Check with Rachel by phone or another channel you already know before opening it; report it if she didn't send it",
        "Reply to the email asking Rachel to confirm she sent it",
        "Forward it to a colleague to see if they can open it",
      ],
      correctIndex: 1,
      learningPoint:
        "Genuine accounts get hacked and used to phish contacts. An unexpected link that asks you to sign in is the warning sign, even from someone you know. Check through a separate channel. Replying goes straight back to whoever controls the account.",
    }),
    mcq({
      id: "phish-shared-document-followup",
      followUpFor: "phish-shared-document",
      title: "Known sender, unexpected sign-in",
      patientQuote: "",
      question:
        "A familiar colleague's email asks you to sign in through a link to view a document you weren't expecting. Which check helps most?",
      options: [
        "Hovering over the sender's name",
        "Confirming with them using a phone number or channel you already have",
        "Checking the email has their usual signature",
      ],
      correctIndex: 1,
      learningPoint:
        "A compromised account sends real-looking emails with real signatures. Only a separate channel you already trust confirms the request.",
    }),
    mcq({
      id: "phish-genuine-reminder",
      title: "Training reminder",
      patientQuote: "",
      email: {
        from: "Practice Manager <practice.manager@nhs.net>",
        subject: "Reminder: data security training due Friday",
        body: "Hi all,\n\nJust a reminder that this year's data security awareness training needs to be completed by Friday. Log in to the training system the usual way and let me know if you have any problems.\n\nThanks",
      },
      question:
        "This arrived from your own practice manager's usual address, after it was mentioned at the team meeting. What is the right response?",
      options: [
        "Report it as phishing, because it mentions a deadline",
        "Treat it as genuine: it is expected, from a known address, has no links and asks for nothing unusual",
        "Delete it to be safe",
        "Reply with your training login details to confirm you've seen it",
      ],
      correctIndex: 1,
      learningPoint:
        "Not every email is a threat. An expected message from a known address that asks you to use your usual route, with no links or requests for details, is low risk. If you're ever unsure, ask the sender in person.",
    }),
    {
      kind: "order",
      ...core,
      id: "phish-report-steps",
      title: "Reporting a suspicious email",
      patientQuote: "",
      email: {
        from: "DocuFax Secure <alerts@docufax-secure.net>",
        subject: "You have 1 new encrypted fax",
        body: "A new encrypted fax has been delivered for your practice.\n\nView fax (PDF) → https://docufax-secure.net/fax/31877\n\nThis link will expire in 12 hours.",
      },
      question:
        "You think this email is phishing and haven't clicked anything. Put the steps in order.",
      sequence: {
        steps: [
          { id: "stop", label: "Don't click links, open attachments or reply" },
          { id: "dont-forward", label: "Don't forward it to colleagues to ask if it's real" },
          { id: "report", label: "Report it using your organisation's phishing report route" },
          { id: "manager", label: "Let your practice manager know if it targets the practice" },
          { id: "delete", label: "Delete it from your inbox" },
        ],
        correctOrder: ["stop", "dont-forward", "report", "manager", "delete"],
        presentationOrder: ["report", "delete", "stop", "manager", "dont-forward"],
      },
      learningPoint:
        "Stop first, keep it contained, then report it so IT can block it for everyone. Delete it only after reporting, because the report needs the original message.",
    },
    mcq({
      id: "phish-already-clicked",
      title: "You already entered your password",
      patientQuote: "",
      question:
        "You clicked a link in an email and typed your password into the page before realising it was fake. What should you do?",
      options: [
        "Say nothing and hope nothing happens",
        "Change your password and tell your manager or IT straight away, even though it's embarrassing",
        "Wait a few days to see if anything unusual happens",
        "Delete the email so nobody finds out",
      ],
      correctIndex: 1,
      learningPoint:
        "Speed matters more than blame. Change your password and report it immediately so IT can lock the account and check for misuse. Hiding it gives the attacker time to reach patient data.",
    }),
    mcq({
      id: "phish-supplier-bank",
      title: "Supplier bank details change",
      patientQuote: "",
      email: {
        from: "MediSupply Accounts <accounts@medisupply-uk.co>",
        subject: "RE: Invoice 40172 - updated bank details",
        body: "Good afternoon,\n\nPlease note we have recently changed banks. Kindly update our details before paying the attached invoice, which is now overdue:\n\nAccount name: MediSupply Ltd\nSort code: 20-41-77\nAccount number: 61839204\n\nMany thanks,\nAccounts Team",
      },
      question: "The practice does order from MediSupply. What should happen next?",
      options: [
        "Update the bank details so the overdue invoice can be paid",
        "Reply to the email asking them to confirm the change",
        "Phone MediSupply on the number in your existing records, not the email, and tell your practice manager",
        "Pay half now and the rest once they confirm",
      ],
      correctIndex: 2,
      learningPoint:
        "Bank-detail change requests are a common fraud. Always verify using contact details you already hold. A reply only reaches the fraudster.",
    }),
    mcq({
      id: "phish-gp-gift-cards",
      title: "Urgent favour from a GP partner",
      patientQuote: "",
      email: {
        from: "Dr Sarah Ahmed <dr.sarah.ahmed.gp@mailbox-uk.net>",
        subject: "Quick favour",
        body: "Hi, are you on the desk? I'm stuck in back-to-back meetings and can't talk.\n\nI need you to buy 5 x £100 gift cards for staff thank-yous. Scratch off the codes and email photos to me and I'll pay you back today. Please keep it a surprise and don't mention it to anyone.\n\nSent from my phone",
      },
      question: "Dr Ahmed is a real partner at your practice. What do you do?",
      options: [
        "Buy the cards, because a partner asked and it's for staff",
        "Reply asking which shop to use",
        "Don't buy anything; check with Dr Ahmed in person or on a known number and report the email",
        "Buy one card first to check it's real",
      ],
      correctIndex: 2,
      learningPoint:
        "Scammers copy a senior person's name, add urgency and secrecy, and ask for something untraceable like gift cards. A personal address and 'can't talk' are deliberate. Always verify in person or on a known number.",
    }),
    mcq({
      id: "phish-gp-gift-cards-followup",
      followUpFor: "phish-gp-gift-cards",
      title: "Spotting impersonation",
      patientQuote: "",
      question: "Which combination most strongly suggests an impersonation scam?",
      options: [
        "A friendly tone and a short email",
        "A request for gift cards or payment, plus pressure to keep it secret",
        "An email sent from a phone",
      ],
      correctIndex: 1,
      learningPoint:
        "Payment in untraceable form plus secrecy is the core of impersonation fraud. Genuine managers don't ask staff to secretly buy gift cards.",
    }),
    mcq({
      id: "phish-solicitor-records",
      title: "Solicitor requesting records",
      patientQuote: "",
      email: {
        from: "Harrow & Finch Solicitors <records@harrowfinch-legal.co.uk>",
        subject: "Medical records request – Mr J. Thompson – court deadline",
        body: "Dear Sir/Madam,\n\nWe act for your patient Mr James Thompson (DOB 14/03/1971) in an ongoing personal injury claim. Please find attached his signed consent form authorising release of his full GP record.\n\nAs the court deadline is this Friday, we would be grateful if you could email the complete record directly to this address today.\n\nKind regards,\nM. Finch\nHarrow & Finch Solicitors",
      },
      question:
        "The email looks professional and includes a signed consent form. What should you do?",
      options: [
        "Email the full record, because signed consent is attached",
        "Send just a summary to be safe",
        "Don't send anything; pass it to the practice's records request process so the requester and consent are verified properly",
        "Phone the number in the email signature to confirm",
      ],
      correctIndex: 2,
      learningPoint:
        "Third-party requests for patient records must go through the practice's records process, which verifies the requester and the consent independently. Attached forms can be forged and deadlines are used to rush you. Releasing data wrongly is a UK GDPR breach.",
    }),
    mcq({
      id: "phish-solicitor-records-followup",
      followUpFor: "phish-solicitor-records",
      title: "Who releases records?",
      patientQuote: "",
      question:
        "An email asks you to send a patient's records to a third party. Who decides whether they're released?",
      options: [
        "Whoever reads the email first",
        "The practice's records or subject access process, following its checks",
        "The person asking, if they say it's urgent",
      ],
      correctIndex: 1,
      learningPoint:
        "Reception's job is to route the request, not to decide on or release records. The records process carries out the identity and consent checks.",
    }),
    {
      kind: "matching",
      ...core,
      pairingMode: "one_to_one",
      id: "phish-data-requests-match",
      title: "Handling data requests by email",
      question: "Match each email to the right action.",
      items: [
        { id: "own-records", label: "A patient asks for a copy of their own records" },
        {
          id: "police",
          label: "Someone claiming to be police asks urgently for a patient's address",
        },
        {
          id: "insurer",
          label: "An insurer asks for a patient's full record, saying consent is attached",
        },
        {
          id: "fake-cqc",
          label: "'CQC inspection team' at cqc-inspections.co asks you to confirm your login",
        },
      ],
      targets: [
        {
          id: "sar",
          label: "Log it as a subject access request and follow the SAR process",
          kind: "action",
        },
        {
          id: "escalate",
          label: "Don't release anything; escalate to the practice manager or IG lead",
          kind: "action",
        },
        {
          id: "consent",
          label: "Pass it to the records team to verify the consent before any release",
          kind: "action",
        },
        { id: "report", label: "Report it as phishing and don't reply", kind: "action" },
      ],
      validMatches: {
        "own-records": ["sar"],
        police: ["escalate"],
        insurer: ["consent"],
        "fake-cqc": ["report"],
      },
      learningPoint:
        "Every request for patient data goes through a process with checks, never a direct reply. A request for your login is never genuine, whoever it claims to be from.",
    },
  ],
};

export const CORE_MODULES: readonly Module[] = [phishingEmail];
const coreIds = new Set(CORE_MODULES.map((m) => m.id));

/** Every practice sees the canonical core modules; a stored copy with the same id is ignored. */
export const withCoreModules = (modules: Module[]): Module[] => [
  ...modules.filter((m) => !coreIds.has(m.id)),
  ...CORE_MODULES.map((m) => structuredClone(m)),
];

/** Core modules are never persisted per practice, so they can't be edited, shared or flagged. */
export const withoutCoreModules = (modules: Module[]): Module[] =>
  modules.filter((m) => !m.core && !coreIds.has(m.id));
