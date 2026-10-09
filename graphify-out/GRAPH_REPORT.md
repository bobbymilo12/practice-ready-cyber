# Graph Report - practice-ready-hub  (2026-10-09)

## Corpus Check
- 209 files · ~133,563 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: .css 4, (none) 3, .toml 2)

## Summary
- 1277 nodes · 3383 edges · 50 communities (41 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Employee Exceptions & Escalation
- Routing & Sequence Board
- Module Question Setup
- UI Menus & Navigation
- Supabase, Contact & Start
- Frontend Dependencies
- Core Appointment Recipes
- Practice Config Types & Store
- UI Sheet & Layout
- Product Plans & Journeys
- Local Procedures
- UI Radix Widgets
- Router & Routes
- Node Test Runtime
- Dev Backend & Snapshot
- package.json
- Dialogs & Pickers
- Marketing & Contact
- Dev Dependencies
- Appointment Capabilities
- Command Palette
- components.json
- Alerts & Toggles
- tsconfig
- Form Inputs
- npm Scripts
- Forms
- Role Matching
- Playwright E2E
- Carousel
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48

## God Nodes (most connected - your core abstractions)
1. `cn()` - 220 edges
2. `react` - 75 edges
3. `useApp` - 69 edges
4. `@tanstack/react-router` - 33 edges
5. `Shell()` - 32 edges
6. `Card()` - 32 edges
7. `PracticeData` - 31 edges
8. `configuredScenarios()` - 28 edges
9. `requestRoleId()` - 26 edges
10. `FileRoutesByPath` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Manager invites trainee (invite page, Invited/Active status)` --semantically_similar_to--> `Trainee invitation with temporary password`  [INFERRED] [semantically similar]
  .lovable/plan/manager-and-trainee-journeys-2026-09-14.md → docs/SETUP.md
- `Practice setup journey` --semantically_similar_to--> `Guided manager setup flow`  [INFERRED] [semantically similar]
  .lovable/plan/manager-and-trainee-journeys-2026-09-14.md → docs/PRODUCT-REVIEW.md
- `load()` --indirect_call--> `moveSequence()`  [INFERRED]
  tests/sequence-board.test.ts → src/lib/sequence.ts
- `Auto-created draft modules and merge modules` --conceptually_related_to--> `Predefined module creation`  [INFERRED]
  .lovable/plan/manager-and-trainee-journeys-2026-09-14.md → docs/predefined-module-creation.md
- `context()` --calls--> `suggestedRole()`  [EXTRACTED]
  tests/core-generation.test.ts → src/lib/role-requests.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Appointment Booking module generation pipeline** — docs_core_training_editorial_approval, docs_core_training_controlled_generation, docs_core_training_core_local_selection, docs_core_training_learn_apply_levels, src_lib_module_config [INFERRED 0.85]
- **Contact form submission flow** — docs_contact_contact_form, src_lib_contact_handler, docs_contact_contact_messages_table, docs_contact_resend_notification, docs_contact_honeypot [EXTRACTED 1.00]
- **Manager setup to trainee onboarding journey** — docs_product_review_guided_manager_setup, docs_predefined_module_creation_predefined_module_creation, docs_setup_trainee_invite_flow, _lovable_plan_manager_and_trainee_journeys_2026_09_14_tracking_results [INFERRED 0.75]

## Communities (50 total, 9 thin omitted)

### Community 0 - "Employee Exceptions & Escalation"
Cohesion: 0.06
Nodes (87): EmployeeExceptions(), contactKey(), Entry, escalationChoices(), EscalationContacts(), BookingFields(), Check(), ContactFields() (+79 more)

### Community 1 - "Routing & Sequence Board"
Cohesion: 0.08
Nodes (75): @tanstack/react-router, AccountGate(), SequenceBoard(), Badge(), Card(), Shell(), api(), clearWorkspace() (+67 more)

### Community 2 - "Module Question Setup"
Cohesion: 0.08
Nodes (66): ModuleQuestion(), PredefinedModuleSetup(), baseStructuredBookingExercises(), bookingActionKey(), configuredBookingActions(), exerciseSignature(), genericMistakes, localAnswerOptions() (+58 more)

### Community 3 - "UI Menus & Navigation"
Cohesion: 0.05
Nodes (54): @radix-ui/react-context-menu, @radix-ui/react-dropdown-menu, @radix-ui/react-menubar, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList (+46 more)

### Community 4 - "Supabase, Contact & Start"
Cohesion: 0.05
Nodes (45): public.contact_messages table (insert-only RLS), @supabase/supabase-js, @tanstack/react-start, zod, attachSupabaseAuth, createSupabaseFetch(), isNewSupabaseApiKey(), requireSupabaseAuth (+37 more)

### Community 5 - "Frontend Dependencies"
Cohesion: 0.03
Nodes (58): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @fontsource/inter, @fontsource/plus-jakarta-sans (+50 more)

### Community 6 - "Core Appointment Recipes"
Cohesion: 0.06
Nodes (50): applyContent, appointmentRecipe(), Content, coreForbiddenInferences, titles, regenerateAppointmentCore(), baseConstraints, CoreEligibility (+42 more)

### Community 7 - "Practice Config Types & Store"
Cohesion: 0.06
Nodes (54): BookingConfig, PrescriptionConfig, SafeguardingRoute, PracticeRoleRequests, AccountRole, APPOINTMENT_QUESTIONS, appointmentPool(), AppState (+46 more)

### Community 8 - "UI Sheet & Layout"
Cohesion: 0.06
Nodes (38): Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle (+30 more)

### Community 9 - "Product Plans & Journeys"
Cohesion: 0.06
Nodes (39): CI workflow (tsc + npm test on Node 22), Demo-only device-stored accounts, Manager and trainee journeys plan, Auto-created draft modules and merge modules, Practice setup journey, Tracking and results (3-fail flag, redo, emoji marks), Manager invites trainee (invite page, Invited/Active status), Public contact form (/contact, POST /api/contact) (+31 more)

### Community 10 - "Local Procedures"
Cohesion: 0.12
Nodes (33): LocalProcedures(), persist(), saveChoices(), ProcedureEditor(), save(), saveLocalProcedures(), localProcedureSequence(), addProcedureStep() (+25 more)

### Community 11 - "UI Radix Widgets"
Cohesion: 0.08
Nodes (25): @radix-ui/react-avatar, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-scroll-area, @radix-ui/react-slider, @radix-ui/react-switch, @radix-ui/react-tabs (+17 more)

### Community 12 - "Router & Routes"
Cohesion: 0.06
Nodes (34): @tanstack/react-query, getRouter(), AboutRoute, AccessibilityRoute, ApiContactRoute, ApiResendReceivingRoute, AuthRoute, ContactRoute (+26 more)

### Community 13 - "Node Test Runtime"
Cohesion: 0.10
Nodes (16): react-dom, typescript, values, js, mockClient, tables, testEnv, writes (+8 more)

### Community 14 - "Dev Backend & Snapshot"
Cohesion: 0.12
Nodes (26): PracticeState, Snapshot, devApi(), read(), seed(), Workspace, createTestSequenceScenario(), SequenceSource (+18 more)

### Community 15 - "package.json"
Cohesion: 0.07
Nodes (29): name, private, sideEffects, type, clsx, date-fns, drizzle-orm, eslint (+21 more)

### Community 16 - "Dialogs & Pickers"
Cohesion: 0.11
Nodes (24): @radix-ui/react-alert-dialog, @radix-ui/react-slot, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter() (+16 more)

### Community 17 - "Marketing & Contact"
Cohesion: 0.13
Nodes (15): ContactSection(), ContactLink(), MarketingShell(), AboutPage(), PILLARS, Route, AccessibilityPage(), Route (+7 more)

### Community 18 - "Dev Dependencies"
Cohesion: 0.09
Nodes (22): devDependencies, drizzle-kit, drizzle-orm, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks (+14 more)

### Community 19 - "Appointment Capabilities"
Cohesion: 0.14
Nodes (19): aliases, AppointmentCapabilities, AppointmentId, appointmentTypes, canHandleAppointment(), CapabilityMap, capabilityRole(), Clinician (+11 more)

### Community 20 - "Command Palette"
Cohesion: 0.13
Nodes (17): cmdk, @radix-ui/react-dialog, Command, CommandDialog(), CommandEmpty, CommandGroup, CommandInput, CommandItem (+9 more)

### Community 21 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 22 - "Alerts & Toggles"
Cohesion: 0.14
Nodes (15): class-variance-authority, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Alert, AlertDescription, AlertTitle, alertVariants, Badge() (+7 more)

### Community 23 - "tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+10 more)

### Community 24 - "Form Inputs"
Cohesion: 0.11
Nodes (14): input-otp, lucide-react, @radix-ui/react-checkbox, @radix-ui/react-radio-group, react-resizable-panels, Checkbox, InputOTP, InputOTPGroup (+6 more)

### Community 25 - "npm Scripts"
Cohesion: 0.12
Nodes (17): scripts, backend:check, build, build:dev, dev, format, lint, preview (+9 more)

### Community 26 - "Forms"
Cohesion: 0.18
Nodes (14): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+6 more)

### Community 27 - "Role Matching"
Cohesion: 0.21
Nodes (13): arrange(), combinations(), inspectRoleMatching(), MatchingDiagnostic, roleMatchingScenario(), uniqueMatching(), visit(), requestCategories (+5 more)

### Community 28 - "Playwright E2E"
Cohesion: 0.19
Nodes (3): @playwright/test, topics, addPracticeRole()

### Community 29 - "Carousel"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (8): LovableErrorOptions, LovableEvents, reportLovableError(), Window, ErrorComponent(), RootComponent(), Route, FileRoutesById

### Community 31 - "Community 31"
Cohesion: 0.24
Nodes (11): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (12): Route, Route, Route, Route, Route, Route, Route, Route (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (7): @radix-ui/react-accordion, AccordionContent, AccordionItem, AccordionTrigger, FAQS, FaqsPage(), Route

### Community 34 - "Community 34"
Cohesion: 0.28
Nodes (8): @radix-ui/react-navigation-menu, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 35 - "Community 35"
Cohesion: 0.28
Nodes (8): @radix-ui/react-select, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (7): vaul, DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 37 - "Community 37"
Cohesion: 0.29
Nodes (6): @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (6): ../tsconfig.json, compilerOptions, paths, extends, include, npm:@supabase/supabase-js@2.57.4

### Community 39 - "Community 39"
Cohesion: 0.47
Nodes (4): resend, handleResendReceiving(), ReceivedEvent, Route

### Community 40 - "Community 40"
Cohesion: 0.60
Nodes (3): Card, MatchingBoard(), pairCards()

## Knowledge Gaps
- **33 isolated node(s):** `@fontsource/inter`, `@fontsource/plus-jakarta-sans`, `@hookform/resolvers`, `@tailwindcss/vite`, `@tanstack/router-plugin` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 405 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `UI Radix Widgets` to `Employee Exceptions & Escalation`, `Routing & Sequence Board`, `Module Question Setup`, `UI Menus & Navigation`, `Practice Config Types & Store`, `UI Sheet & Layout`, `Local Procedures`, `Node Test Runtime`, `package.json`, `Dialogs & Pickers`, `Marketing & Contact`, `Command Palette`, `Alerts & Toggles`, `Form Inputs`, `Forms`, `Carousel`, `Community 30`, `Community 31`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 40`?**
  _High betweenness centrality (0.302) - this node is a cross-community bridge._
- **What connects `@fontsource/inter`, `@fontsource/plus-jakarta-sans`, `@hookform/resolvers` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Employee Exceptions & Escalation` be split into smaller, more focused modules?**
  _Cohesion score 0.06091644204851752 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Frontend Dependencies` to `package.json`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Should `Routing & Sequence Board` be split into smaller, more focused modules?**
  _Cohesion score 0.0837625979843225 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `Supabase, Contact & Start` to `Routing & Sequence Board`, `package.json`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `Module Question Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.07789678675754626 - nodes in this community are weakly interconnected._