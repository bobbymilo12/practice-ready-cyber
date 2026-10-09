# Graph Report - practice-ready-hub  (2026-10-09)

## Corpus Check
- 196 files · ~132,165 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 4, (none) 3, .example 1)

## Summary
- 1257 nodes · 3361 edges · 50 communities (43 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `807b9b50`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- __root.tsx
- chart.tsx
- train.tsx
- training.ts
- navigation-menu.tsx
- select.tsx
- drawer.tsx
- eslint.config.js
- supabase/tsconfig.json
- api.resend-receiving.ts
- data-hub.tsx
- dev-backend.ts
- sonner.tsx
- order
- deno.d.ts
- drizzle-kit
- vite.config.ts
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible

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
- `load()` --indirect_call--> `moveSequence()`  [INFERRED]
  tests/sequence-board.test.ts → src/lib/sequence.ts
- `context()` --calls--> `defaultModuleSettings()`  [EXTRACTED]
  tests/core-generation.test.ts → src/lib/module-config.ts
- `context()` --calls--> `suggestedRole()`  [EXTRACTED]
  tests/core-generation.test.ts → src/lib/role-requests.ts
- `practice()` --calls--> `suggestedRole()`  [EXTRACTED]
  tests/core-integration.test.ts → src/lib/role-requests.ts
- `practice()` --calls--> `suggestedRole()`  [EXTRACTED]
  tests/fixtures/role-matching.ts → src/lib/role-requests.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Contact form submission flow** — docs_contact_contact_form, src_lib_contact_handler, docs_contact_contact_messages_table, docs_contact_resend_notification, docs_contact_honeypot [EXTRACTED 1.00]
- **Appointment Booking module generation pipeline** — docs_core_training_editorial_approval, docs_core_training_controlled_generation, docs_core_training_core_local_selection, docs_core_training_learn_apply_levels, src_lib_module_config [INFERRED 0.85]

## Communities (50 total, 7 thin omitted)

### Community 0 - "Employee Exceptions & Escalation"
Cohesion: 0.06
Nodes (94): EmployeeExceptions(), contactKey(), Entry, escalationChoices(), EscalationContacts(), BookingFields(), Check(), ContactFields() (+86 more)

### Community 1 - "Routing & Sequence Board"
Cohesion: 0.18
Nodes (30): Badge(), Card(), Shell(), importLegacyPractice(), readLegacyPractice(), useConnection, uniqueMatching(), visit() (+22 more)

### Community 2 - "Module Question Setup"
Cohesion: 0.07
Nodes (76): ModuleQuestion(), PredefinedModuleSetup(), baseStructuredBookingExercises(), bookingActionKey(), configuredBookingActions(), exerciseSignature(), genericMistakes, localAnswerOptions() (+68 more)

### Community 3 - "UI Menus & Navigation"
Cohesion: 0.06
Nodes (51): @radix-ui/react-avatar, @radix-ui/react-context-menu, @radix-ui/react-dropdown-menu, @radix-ui/react-slot, @radix-ui/react-tabs, Avatar, AvatarFallback, AvatarImage (+43 more)

### Community 4 - "Supabase, Contact & Start"
Cohesion: 0.06
Nodes (44): public.contact_messages table (insert-only RLS), @supabase/supabase-js, @tanstack/react-start, zod, attachSupabaseAuth, createSupabaseFetch(), isNewSupabaseApiKey(), requireSupabaseAuth (+36 more)

### Community 5 - "Frontend Dependencies"
Cohesion: 0.03
Nodes (58): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @fontsource/inter, @fontsource/plus-jakarta-sans (+50 more)

### Community 6 - "Core Appointment Recipes"
Cohesion: 0.06
Nodes (46): applyContent, appointmentRecipe(), Content, coreForbiddenInferences, titles, baseConstraints, CoreEligibility, corePolicyReasons() (+38 more)

### Community 7 - "Practice Config Types & Store"
Cohesion: 0.07
Nodes (34): BookingConfig, PrescriptionConfig, AccountRole, APPOINTMENT_QUESTIONS, AppState, DIFFICULT_QUESTIONS, FIRST_WEEK_QUESTIONS, FIT_NOTE_QUESTIONS (+26 more)

### Community 8 - "UI Sheet & Layout"
Cohesion: 0.06
Nodes (38): Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle (+30 more)

### Community 9 - "Product Plans & Journeys"
Cohesion: 0.07
Nodes (33): CI workflow (tsc + npm test on Node 22), Public contact form (/contact, POST /api/contact), Honeypot bot friction, Contact notification via Resend to CONTACT_TO, Appointment Booking Core v1, Controlled deterministic Core generation (no model call), 30/70 Core-to-local question selection, Core editorial approval (AB01, AB03, AB04, AB15) (+25 more)

### Community 10 - "Local Procedures"
Cohesion: 0.06
Nodes (53): react-dom, typescript, values, LocalProcedures(), persist(), saveChoices(), ProcedureEditor(), save() (+45 more)

### Community 11 - "UI Radix Widgets"
Cohesion: 0.08
Nodes (27): class-variance-authority, @radix-ui/react-scroll-area, react, ContactSection(), Alert, AlertDescription, AlertTitle, alertVariants (+19 more)

### Community 12 - "Router & Routes"
Cohesion: 0.05
Nodes (51): @tanstack/react-query, getRouter(), Route, Route, Route, Route, Route, Route (+43 more)

### Community 13 - "Node Test Runtime"
Cohesion: 0.22
Nodes (22): AccountGate(), api(), clearWorkspace(), configured, emptyPractice(), fetchWorkspace(), flushPractice(), initializeBackend() (+14 more)

### Community 14 - "Dev Backend & Snapshot"
Cohesion: 0.28
Nodes (6): Assignment, admin, allowedOrigins, check(), fail(), UserError

### Community 15 - "package.json"
Cohesion: 0.05
Nodes (36): name, private, sideEffects, type, clsx, date-fns, drizzle-orm, eslint (+28 more)

### Community 16 - "Dialogs & Pickers"
Cohesion: 0.13
Nodes (21): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+13 more)

### Community 17 - "Marketing & Contact"
Cohesion: 0.19
Nodes (12): @tanstack/react-router, ContactLink(), MarketingShell(), AboutPage(), PILLARS, Route, AccessibilityPage(), CookiesPage() (+4 more)

### Community 18 - "Dev Dependencies"
Cohesion: 0.10
Nodes (21): devDependencies, drizzle-kit, drizzle-orm, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks (+13 more)

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
Cohesion: 0.11
Nodes (12): @radix-ui/react-menubar, Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator (+4 more)

### Community 23 - "tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+10 more)

### Community 24 - "Form Inputs"
Cohesion: 0.11
Nodes (17): input-otp, lucide-react, react-resizable-panels, AccordionContent, AccordionItem, AccordionTrigger, Checkbox, InputOTP (+9 more)

### Community 25 - "npm Scripts"
Cohesion: 0.12
Nodes (17): scripts, backend:check, build, build:dev, dev, format, lint, preview (+9 more)

### Community 26 - "Forms"
Cohesion: 0.18
Nodes (14): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+6 more)

### Community 27 - "Role Matching"
Cohesion: 0.22
Nodes (14): build(), createTestSequenceScenario(), SequenceContent, SequenceProvenance, SequenceSource, shuffleSequence(), CoreScenarioProvenance, LegacyOrderScenario (+6 more)

### Community 28 - "Playwright E2E"
Cohesion: 0.19
Nodes (3): @playwright/test, topics, addPracticeRole()

### Community 29 - "Carousel"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 31 - "chart.tsx"
Cohesion: 0.24
Nodes (11): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+3 more)

### Community 32 - "train.tsx"
Cohesion: 0.36
Nodes (8): SequenceBoard(), trainingAction(), moveSequence(), Route, ScenarioBlock(), Train(), Training(), act()

### Community 33 - "training.ts"
Cohesion: 0.28
Nodes (15): devApi(), isStepPermutation(), advanceSession(), answerSession(), AnswerValue, isMatchingAnswer(), MatchingAnswer, matchingComplete() (+7 more)

### Community 34 - "navigation-menu.tsx"
Cohesion: 0.28
Nodes (8): @radix-ui/react-navigation-menu, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 35 - "select.tsx"
Cohesion: 0.28
Nodes (8): @radix-ui/react-select, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 36 - "drawer.tsx"
Cohesion: 0.25
Nodes (7): vaul, DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 37 - "eslint.config.js"
Cohesion: 0.29
Nodes (6): @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 38 - "supabase/tsconfig.json"
Cohesion: 0.29
Nodes (6): ../tsconfig.json, compilerOptions, paths, extends, include, npm:@supabase/supabase-js@2.57.4

### Community 39 - "api.resend-receiving.ts"
Cohesion: 0.47
Nodes (4): resend, handleResendReceiving(), ReceivedEvent, Route

### Community 40 - "data-hub.tsx"
Cohesion: 0.20
Nodes (10): RolePolicies, BulletField(), DataHub(), LOCAL_FIELDS, PracticeTextKey, REPEAT_FIELDS, ROLE_GROUPS, RoleGroup (+2 more)

### Community 41 - "dev-backend.ts"
Cohesion: 0.25
Nodes (8): PracticeState, Snapshot, read(), seed(), Workspace, Account, defaultPracticeData, Trainee

### Community 43 - "order"
Cohesion: 0.50
Nodes (8): appointmentPool(), genericPool(), mcq(), order(), poolForTopic(), prescriptionPool(), uid(), urgentPool()

### Community 46 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): nitro, @tailwindcss/vite, vite, vite-tsconfig-paths, @vitejs/plugin-react

## Knowledge Gaps
- **29 isolated node(s):** `@fontsource/inter`, `@fontsource/plus-jakarta-sans`, `@hookform/resolvers`, `@tanstack/router-plugin`, `date-fns` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 394 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `UI Radix Widgets` to `Employee Exceptions & Escalation`, `Routing & Sequence Board`, `Module Question Setup`, `UI Menus & Navigation`, `UI Sheet & Layout`, `Local Procedures`, `Node Test Runtime`, `package.json`, `Dialogs & Pickers`, `Marketing & Contact`, `Command Palette`, `Alerts & Toggles`, `Form Inputs`, `Forms`, `Carousel`, `__root.tsx`, `chart.tsx`, `train.tsx`, `navigation-menu.tsx`, `select.tsx`, `drawer.tsx`, `data-hub.tsx`?**
  _High betweenness centrality (0.296) - this node is a cross-community bridge._
- **What connects `@fontsource/inter`, `@fontsource/plus-jakarta-sans`, `@hookform/resolvers` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Employee Exceptions & Escalation` be split into smaller, more focused modules?**
  _Cohesion score 0.056978730010867874 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Frontend Dependencies` to `package.json`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `Module Question Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.065684899485741 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `Supabase, Contact & Start` to `Node Test Runtime`, `package.json`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `UI Menus & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.06110102843315184 - nodes in this community are weakly interconnected._