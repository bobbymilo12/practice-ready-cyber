# Graph Report - practice-ready-hub  (2026-10-10)

## Corpus Check
- 215 files · ~141,734 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1322 nodes · 3558 edges · 58 communities (55 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.84)
- Token cost: 138,064 input · 0 output

## Community Hubs (Navigation)
- App Shell & Auth Gate
- Staff Exceptions & Escalation
- Radix Menus & Avatar
- Core Appointment Recipes
- Runtime Dependencies
- Sheet & Tooltip UI
- Project Config
- Radix Form Primitives
- Dev Backend & Practice State
- Local Procedures Editor
- Route Tree
- Module Questions & Config
- Alerts & Toggles
- Backend Check Script
- Alert Dialog & Calendar
- Dev Tooling Deps
- Matching Board
- Sequence Board
- Appointment Capabilities
- Command Palette
- Accordion & Icons
- shadcn Config
- Marketing Pages
- Local Booking Scenarios
- TypeScript Config
- npm Scripts
- Supabase Admin Client
- Cookie Consent
- Playwright E2E Tests
- Form Components
- Carousel
- Error Capture
- Predefined Module Setup
- Supabase Auth Middleware
- Practice Scenarios
- Route Stubs
- GDPR & Isolation Docs
- Training Design Docs
- Charts
- Contact & Project Docs
- Training Types
- CI & Core Registry Docs
- Select UI
- Breadcrumb UI
- Drawer UI
- Practice API Tests
- Product Review & Setup Docs
- Practice State Storage Docs
- Root Layout
- Edge Function TS Config
- Supabase Browser Client
- Resend Receiving Webhook
- Router Setup
- Contact Form Handler
- Retention & Migration Drift
- About Page
- Deno Types

## God Nodes (most connected - your core abstractions)
1. `cn()` - 220 edges
2. `react` - 76 edges
3. `useApp` - 69 edges
4. `@tanstack/react-router` - 34 edges
5. `Shell()` - 32 edges
6. `PracticeData` - 32 edges
7. `configuredScenarios()` - 29 edges
8. `Card()` - 28 edges
9. `requestRoleId()` - 26 edges
10. `FileRoutesByPath` - 25 edges

## Surprising Connections (you probably didn't know these)
- `fixture()` --calls--> `confirmProcedure()`  [EXTRACTED]
  tests/appointment-quality.test.ts → src/lib/local-procedures.ts
- `fixture()` --calls--> `confirmProcedure()`  [EXTRACTED]
  tests/local-procedure-sequences.test.ts → src/lib/local-procedures.ts
- `context()` --calls--> `defaultModuleSettings()`  [EXTRACTED]
  tests/core-generation.test.ts → src/lib/module-config.ts
- `context()` --calls--> `suggestedRole()`  [EXTRACTED]
  tests/core-generation.test.ts → src/lib/role-requests.ts
- `practice()` --calls--> `suggestedRole()`  [EXTRACTED]
  tests/core-integration.test.ts → src/lib/role-requests.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Deterministic, source-grounded training generation with manager approval** — docs_core_training_controlled_generation, docs_predefined_module_creation_no_fabrication, readme_manager_approval_of_drafts, docs_core_training_selected_module_scenarios, docs_predefined_module_creation_predefined_topics [INFERRED 0.85]
- **Personal data retention and deletion** — docs_gdpr_data_map, docs_backend_map_purge_expired_personal_data, docs_backend_map_contact_messages, docs_backend_map_training_sessions, docs_gdpr_dsr_procedure [INFERRED 0.85]
- **Interactive question formats (MCQ levels, matching, ordering)** — docs_matching_local_check_matching_board, docs_sequencing_stage1_structured_order_scenario, docs_core_training_learn_apply_levels, docs_project_overview_user_journeys [INFERRED 0.75]

## Communities (58 total, 3 thin omitted)

### Community 0 - "App Shell & Auth Gate"
Cohesion: 0.06
Nodes (102): @tanstack/react-router, AccountGate(), Badge(), Card(), Shell(), api(), clearWorkspace(), configured (+94 more)

### Community 1 - "Staff Exceptions & Escalation"
Cohesion: 0.06
Nodes (95): EmployeeExceptions(), contactKey(), Entry, escalationChoices(), EscalationContacts(), BookingFields(), Check(), ContactFields() (+87 more)

### Community 2 - "Radix Menus & Avatar"
Cohesion: 0.05
Nodes (54): @radix-ui/react-avatar, @radix-ui/react-dropdown-menu, @radix-ui/react-menubar, @radix-ui/react-tabs, Avatar, AvatarFallback, AvatarImage, Card (+46 more)

### Community 3 - "Core Appointment Recipes"
Cohesion: 0.06
Nodes (53): applyContent, appointmentRecipe(), Content, coreForbiddenInferences, titles, appointmentCorePool(), regenerateAppointmentCore(), baseConstraints (+45 more)

### Community 4 - "Runtime Dependencies"
Cohesion: 0.03
Nodes (59): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @fontsource/inter, @fontsource/plus-jakarta-sans (+51 more)

### Community 5 - "Sheet & Tooltip UI"
Cohesion: 0.06
Nodes (40): @radix-ui/react-separator, @radix-ui/react-tooltip, Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader() (+32 more)

### Community 6 - "Project Config"
Cohesion: 0.06
Nodes (35): name, private, sideEffects, type, date-fns, drizzle-kit, drizzle-orm, eslint (+27 more)

### Community 7 - "Radix Form Primitives"
Cohesion: 0.07
Nodes (26): clsx, @radix-ui/react-checkbox, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-scroll-area, @radix-ui/react-slider (+18 more)

### Community 8 - "Dev Backend & Practice State"
Cohesion: 0.12
Nodes (29): PracticeState, Snapshot, devApi(), read(), seed(), Workspace, isStepPermutation(), Account (+21 more)

### Community 9 - "Local Procedures Editor"
Cohesion: 0.13
Nodes (30): LocalProcedures(), persist(), saveChoices(), ProcedureEditor(), save(), saveLocalProcedures(), addProcedureStep(), Confirmation (+22 more)

### Community 10 - "Route Tree"
Cohesion: 0.06
Nodes (31): Route, AboutRoute, AccessibilityRoute, ApiContactRoute, ApiResendReceivingRoute, AuthRoute, ContactRoute, CookiesRoute (+23 more)

### Community 11 - "Module Questions & Config"
Cohesion: 0.18
Nodes (25): ModuleQuestion(), answerText(), channels, configuredContacts(), contact(), EXCLUDE_QUESTION, extraRuleLabels, Fact (+17 more)

### Community 12 - "Alerts & Toggles"
Cohesion: 0.09
Nodes (23): class-variance-authority, @radix-ui/react-navigation-menu, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Alert, AlertDescription, AlertTitle, alertVariants (+15 more)

### Community 13 - "Backend Check Script"
Cohesion: 0.17
Nodes (13): typescript, values, inspectLocalProcedureSequences(), localProcedureSequence(), procedureTargets(), procedureGenerationReport(), createSequenceScenario(), fixture() (+5 more)

### Community 14 - "Alert Dialog & Calendar"
Cohesion: 0.12
Nodes (23): @radix-ui/react-alert-dialog, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+15 more)

### Community 15 - "Dev Tooling Deps"
Cohesion: 0.08
Nodes (23): devDependencies, drizzle-kit, drizzle-orm, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks (+15 more)

### Community 16 - "Matching Board"
Cohesion: 0.14
Nodes (18): react-dom, Card, MatchingBoard(), pairCards(), arrange(), combinations(), inspectRoleMatching(), MatchingDiagnostic (+10 more)

### Community 17 - "Sequence Board"
Cohesion: 0.17
Nodes (15): SequenceBoard(), build(), createTestSequenceScenario(), moveSequence(), SequenceContent, SequenceProvenance, SequenceSource, shuffleSequence() (+7 more)

### Community 18 - "Appointment Capabilities"
Cohesion: 0.15
Nodes (18): aliases, AppointmentId, appointmentTypes, canHandleAppointment(), CapabilityMap, capabilityRole(), Clinician, clinicianCapabilities() (+10 more)

### Community 19 - "Command Palette"
Cohesion: 0.13
Nodes (17): cmdk, @radix-ui/react-dialog, Command, CommandDialog(), CommandEmpty, CommandGroup, CommandInput, CommandItem (+9 more)

### Community 20 - "Accordion & Icons"
Cohesion: 0.14
Nodes (15): input-otp, lucide-react, @radix-ui/react-accordion, react-resizable-panels, AccordionContent, AccordionItem, AccordionTrigger, InputOTP (+7 more)

### Community 21 - "shadcn Config"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 22 - "Marketing Pages"
Cohesion: 0.13
Nodes (13): OPEN_COOKIE_SETTINGS, ContactLink(), MarketingShell(), AccessibilityPage(), Route, CookiesPage(), Route, Home() (+5 more)

### Community 23 - "Local Booking Scenarios"
Cohesion: 0.20
Nodes (16): baseStructuredBookingExercises(), bookingActionKey(), configuredBookingActions(), exerciseSignature(), genericMistakes, localAnswerOptions(), neutralLearnSituation(), structuredBookingExercises() (+8 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+10 more)

### Community 25 - "npm Scripts"
Cohesion: 0.11
Nodes (18): scripts, backend:check, build, build:dev, dev, format, lint, preview (+10 more)

### Community 26 - "Supabase Admin Client"
Cohesion: 0.18
Nodes (12): @supabase/supabase-js, zod, createSupabaseAdminClient(), createSupabaseFetch(), isNewSupabaseApiKey(), supabaseAdmin, ContactDatabase, ContactRow (+4 more)

### Community 27 - "Cookie Consent"
Cohesion: 0.25
Nodes (12): CookieBanner(), choose(), read(), visitorId(), consentSchema, COOKIE_POLICY_VERSION, CookieDatabase, recordConsent (+4 more)

### Community 28 - "Playwright E2E Tests"
Cohesion: 0.18
Nodes (4): @playwright/test, defaultPracticeData, topics, addPracticeRole()

### Community 29 - "Form Components"
Cohesion: 0.18
Nodes (14): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+6 more)

### Community 30 - "Carousel"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 31 - "Error Capture"
Cohesion: 0.24
Nodes (9): @tanstack/react-start, consumeLastCapturedError(), renderErrorPage(), fetch(), getServerEntry(), isH3SwallowedErrorBody(), normalizeCatastrophicSsrResponse(), ServerEntry (+1 more)

### Community 32 - "Predefined Module Setup"
Cohesion: 0.26
Nodes (12): PredefinedModuleSetup(), configuredFollowUp(), defaultModuleSettings(), generateConfiguredModule(), lengthOptions, regenerateConfiguredScenario(), reviseConfiguredScenario(), selectedModuleScenarios() (+4 more)

### Community 33 - "Supabase Auth Middleware"
Cohesion: 0.16
Nodes (13): createSupabaseFetch(), isNewSupabaseApiKey(), requireSupabaseAuth, CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema (+5 more)

### Community 34 - "Practice Scenarios"
Cohesion: 0.32
Nodes (12): practiceScenarios(), effectiveRequestsForStaff(), action(), Application, applicationMistakes(), applications(), ConditionFrame, explicitRules() (+4 more)

### Community 35 - "Route Stubs"
Cohesion: 0.15
Nodes (13): Route, Route, Route, Route, Route, Route, Route, Route (+5 more)

### Community 36 - "GDPR & Isolation Docs"
Cohesion: 0.18
Nodes (10): Backend & database map, GDPR compliance record, Breach procedure (ICO 72h), Controller/processor split (practice vs PracticeReady), DPIA screening, Data-subject rights procedure, Processors: Supabase, Vercel, Resend, Gmail, Live journey verification checklist (+2 more)

### Community 37 - "Training Design Docs"
Cohesion: 0.21
Nodes (12): training_sessions table (answers, scores, scenario snapshot), approvedAppointmentCoreVersions (AB01/AB03/AB04/AB15 pinned), Learn / Apply training levels (Handle disabled), Core scenario provenance and pinned regeneration, selectedModuleScenarios 30/70 Core/local interleaving, Appointment Booking matching local check, Matching board (unique 3x3/4x4 role-request solution), Guided manager setup wizard (+4 more)

### Community 38 - "Charts"
Cohesion: 0.24
Nodes (11): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+3 more)

### Community 39 - "Contact & Project Docs"
Cohesion: 0.22
Nodes (11): Public contact form doc, POST /api/contact server route, Honeypot bot friction (not rate limiting), Marketing photography record, Pexels licence for stock marketing images, PracticeReady project overview, Architecture: browser -> practice-api Edge Function -> Postgres RLS, CookieBanner consent in localStorage (+3 more)

### Community 40 - "Training Types"
Cohesion: 0.24
Nodes (9): CoreScenarioProvenance, Difficulty, LegacyOrderScenario, MatchingScenario, ModuleLength, OrderScenarioBase, ScenarioStatus, StructuredOrderScenario (+1 more)

### Community 41 - "CI & Core Registry Docs"
Cohesion: 0.25
Nodes (7): CI workflow (GitHub Actions), CI test job (npm ci, tsc --noEmit, npm test, Node 22), Appointment Booking Core v1 doc, Source-controlled Core registry with editorial approval, npm run backend:check read-only backend check, PracticeReady README, PracticeReady (GP reception onboarding product)

### Community 42 - "Select UI"
Cohesion: 0.28
Nodes (8): @radix-ui/react-select, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 43 - "Breadcrumb UI"
Cohesion: 0.22
Nodes (8): @radix-ui/react-slot, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 44 - "Drawer UI"
Cohesion: 0.25
Nodes (7): vaul, DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 45 - "Practice API Tests"
Cohesion: 0.22
Nodes (5): js, mockClient, tables, testEnv, writes

### Community 46 - "Product Review & Setup Docs"
Cohesion: 0.29
Nodes (8): Plain-text temporary password in invite email (risk), PracticeReady product review, Outstanding work (password recovery, change tracking, completion policy), Setup: connect PracticeReady to Supabase and Resend, Roles with employee exceptions (requestOverrides), Versioned role template library (unreviewed, no preselected clinical requests), safeguardingRoute.leadIds named leads, Trainee invitation with temporary password (7-day expiry)

### Community 47 - "Practice State Storage Docs"
Cohesion: 0.29
Nodes (5): practices.state JSONB blob (modules, packages, assignments), Predefined module creation, Six-module induction package, Versioned Module.settings (length, local extras), Nine predefined training topics

### Community 49 - "Edge Function TS Config"
Cohesion: 0.29
Nodes (6): ../tsconfig.json, compilerOptions, paths, extends, include, npm:@supabase/supabase-js@2.57.4

### Community 50 - "Supabase Browser Client"
Cohesion: 0.43
Nodes (5): attachSupabaseAuth, createSupabaseClient(), createSupabaseFetch(), isNewSupabaseApiKey(), supabase

### Community 51 - "Resend Receiving Webhook"
Cohesion: 0.47
Nodes (4): resend, handleResendReceiving(), ReceivedEvent, Route

### Community 52 - "Router Setup"
Cohesion: 0.33
Nodes (5): @tanstack/react-query, getRouter(), Register, routeTree, startInstance

### Community 53 - "Contact Form Handler"
Cohesion: 0.60
Nodes (4): createContactDatabase(), handleContactRequest(), notifyContactByEmail(), Route

### Community 54 - "Retention & Migration Drift"
Cohesion: 0.60
Nodes (5): contact_messages table (insert-only, 24-month retention), purge_expired_personal_data() retention function, Repo vs live database drift, Two migration sources (drizzle + supabase), GDPR data map and retention periods

### Community 55 - "About Page"
Cohesion: 0.50
Nodes (3): AboutPage(), PILLARS, Route

## Knowledge Gaps
- **28 isolated node(s):** `@fontsource/inter`, `@fontsource/plus-jakarta-sans`, `@hookform/resolvers`, `@tanstack/router-plugin`, `date-fns` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 399 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Radix Form Primitives` to `App Shell & Auth Gate`, `Staff Exceptions & Escalation`, `Radix Menus & Avatar`, `Sheet & Tooltip UI`, `Project Config`, `Local Procedures Editor`, `Module Questions & Config`, `Alerts & Toggles`, `Alert Dialog & Calendar`, `Matching Board`, `Sequence Board`, `Command Palette`, `Accordion & Icons`, `Cookie Consent`, `Form Components`, `Carousel`, `Predefined Module Setup`, `Charts`, `Select UI`, `Breadcrumb UI`, `Drawer UI`, `Root Layout`?**
  _High betweenness centrality (0.299) - this node is a cross-community bridge._
- **What connects `@fontsource/inter`, `@fontsource/plus-jakarta-sans`, `@hookform/resolvers` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Auth Gate` be split into smaller, more focused modules?**
  _Cohesion score 0.05573039601363756 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Runtime Dependencies` to `Project Config`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Should `Staff Exceptions & Escalation` be split into smaller, more focused modules?**
  _Cohesion score 0.056598016781083144 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `Radix Menus & Avatar` to `Sheet & Tooltip UI`, `Charts`, `Radix Form Primitives`, `Select UI`, `Breadcrumb UI`, `Alerts & Toggles`, `Drawer UI`, `Alert Dialog & Calendar`, `Command Palette`, `Accordion & Icons`, `Form Components`, `Carousel`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `Radix Menus & Avatar` be split into smaller, more focused modules?**
  _Cohesion score 0.05314685314685315 - nodes in this community are weakly interconnected._