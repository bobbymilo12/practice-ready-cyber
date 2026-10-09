# Graph Report - practice-ready-hub  (2026-10-09)

## Corpus Check
- 197 files · ~134,028 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 4, (none) 3, .example 1)

## Summary
- 1262 nodes · 3377 edges · 53 communities (47 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1e67070`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- training.test.ts
- react
- module-config.ts
- cn
- Supabase, Contact & Start
- Frontend Dependencies
- core-training-generation.ts
- store.ts
- sidebar.tsx
- Product Plans & Journeys
- local-procedures.test.ts
- class-variance-authority
- routeTree.gen.ts
- same-day-requests.test.ts
- role-matching.test.ts
- package.json
- pagination.tsx
- MarketingShell
- Dev Dependencies
- Appointment Capabilities
- command.tsx
- components.json
- Alerts & Toggles
- tsconfig
- utils.ts
- npm Scripts
- Forms
- sequence.test.ts
- Playwright E2E
- Carousel
- Button
- chart.tsx
- lucide-react
- training.ts
- navigation-menu.tsx
- breadcrumb.tsx
- drawer.tsx
- eslint.config.js
- supabase/tsconfig.json
- api.resend-receiving.ts
- ContactSection.tsx
- core-integration.test.ts
- sonner.tsx
- training-types.ts
- deno.d.ts
- drizzle-kit
- vite.config.ts
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- router.tsx
- tabs.tsx
- scroll-area.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 220 edges
2. `react` - 76 edges
3. `useApp` - 69 edges
4. `@tanstack/react-router` - 34 edges
5. `Shell()` - 32 edges
6. `Card()` - 32 edges
7. `PracticeData` - 31 edges
8. `configuredScenarios()` - 28 edges
9. `requestRoleId()` - 26 edges
10. `FileRoutesByPath` - 25 edges

## Surprising Connections (you probably didn't know these)
- `CI workflow (tsc + npm test on Node 22)` --conceptually_related_to--> `PracticeReady app`  [INFERRED]
  .github/workflows/ci.yml → README.md
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

## Communities (53 total, 6 thin omitted)

### Community 0 - "training.test.ts"
Cohesion: 0.05
Nodes (99): EmployeeExceptions(), contactKey(), Entry, escalationChoices(), EscalationContacts(), BookingFields(), Check(), ContactFields() (+91 more)

### Community 1 - "react"
Cohesion: 0.10
Nodes (60): react, @tanstack/react-router, AccountGate(), CookieBanner(), OPEN_COOKIE_SETTINGS, read(), PredefinedModuleSetup(), Badge() (+52 more)

### Community 2 - "module-config.ts"
Cohesion: 0.09
Nodes (51): ModuleQuestion(), baseStructuredBookingExercises(), bookingActionKey(), configuredBookingActions(), exerciseSignature(), genericMistakes, localAnswerOptions(), neutralLearnSituation() (+43 more)

### Community 3 - "cn"
Cohesion: 0.07
Nodes (47): @radix-ui/react-avatar, @radix-ui/react-context-menu, @radix-ui/react-dropdown-menu, @radix-ui/react-select, Avatar, AvatarFallback, AvatarImage, Card (+39 more)

### Community 4 - "Supabase, Contact & Start"
Cohesion: 0.06
Nodes (44): public.contact_messages table (insert-only RLS), @supabase/supabase-js, @tanstack/react-start, zod, attachSupabaseAuth, createSupabaseFetch(), isNewSupabaseApiKey(), requireSupabaseAuth (+36 more)

### Community 5 - "Frontend Dependencies"
Cohesion: 0.03
Nodes (58): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @fontsource/inter, @fontsource/plus-jakarta-sans (+50 more)

### Community 6 - "core-training-generation.ts"
Cohesion: 0.06
Nodes (53): applyContent, appointmentRecipe(), Content, coreForbiddenInferences, titles, appointmentCorePool(), regenerateAppointmentCore(), baseConstraints (+45 more)

### Community 7 - "store.ts"
Cohesion: 0.07
Nodes (43): TopicField, BookingConfig, PrescriptionConfig, SafeguardingRoute, PracticeRoleRequests, Account, AccountRole, APPOINTMENT_QUESTIONS (+35 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.06
Nodes (41): @radix-ui/react-dialog, Input, Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader() (+33 more)

### Community 9 - "Product Plans & Journeys"
Cohesion: 0.07
Nodes (33): CI workflow (tsc + npm test on Node 22), Public contact form (/contact, POST /api/contact), Honeypot bot friction, Contact notification via Resend to CONTACT_TO, Appointment Booking Core v1, Controlled deterministic Core generation (no model call), 30/70 Core-to-local question selection, Core editorial approval (AB01, AB03, AB04, AB15) (+25 more)

### Community 10 - "local-procedures.test.ts"
Cohesion: 0.13
Nodes (32): LocalProcedures(), persist(), saveChoices(), ProcedureEditor(), save(), saveLocalProcedures(), localProcedureSequence(), addProcedureStep() (+24 more)

### Community 11 - "class-variance-authority"
Cohesion: 0.14
Nodes (15): class-variance-authority, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Alert, AlertDescription, AlertTitle, alertVariants, Badge() (+7 more)

### Community 12 - "routeTree.gen.ts"
Cohesion: 0.06
Nodes (44): Route, Route, Route, Route, Route, Route, Route, Route (+36 more)

### Community 13 - "same-day-requests.test.ts"
Cohesion: 0.11
Nodes (16): react-dom, typescript, values, js, mockClient, tables, testEnv, writes (+8 more)

### Community 14 - "role-matching.test.ts"
Cohesion: 0.18
Nodes (13): Card, MatchingBoard(), pairCards(), arrange(), combinations(), inspectRoleMatching(), MatchingDiagnostic, roleMatchingScenario() (+5 more)

### Community 15 - "package.json"
Cohesion: 0.08
Nodes (25): name, private, sideEffects, type, clsx, date-fns, drizzle-orm, eslint (+17 more)

### Community 16 - "pagination.tsx"
Cohesion: 0.12
Nodes (19): @radix-ui/react-alert-dialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay (+11 more)

### Community 17 - "MarketingShell"
Cohesion: 0.20
Nodes (10): ContactLink(), MarketingShell(), AccessibilityPage(), Route, CookiesPage(), Route, PrivacyPage(), Route (+2 more)

### Community 18 - "Dev Dependencies"
Cohesion: 0.10
Nodes (21): devDependencies, drizzle-kit, drizzle-orm, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks (+13 more)

### Community 19 - "Appointment Capabilities"
Cohesion: 0.14
Nodes (19): aliases, AppointmentCapabilities, AppointmentId, appointmentTypes, canHandleAppointment(), CapabilityMap, capabilityRole(), Clinician (+11 more)

### Community 20 - "command.tsx"
Cohesion: 0.13
Nodes (16): cmdk, Command, CommandDialog(), CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList (+8 more)

### Community 21 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 22 - "Alerts & Toggles"
Cohesion: 0.11
Nodes (12): @radix-ui/react-menubar, Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator (+4 more)

### Community 23 - "tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+10 more)

### Community 24 - "utils.ts"
Cohesion: 0.06
Nodes (23): input-otp, @radix-ui/react-checkbox, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-slider, @radix-ui/react-switch (+15 more)

### Community 25 - "npm Scripts"
Cohesion: 0.12
Nodes (17): scripts, backend:check, build, build:dev, dev, format, lint, preview (+9 more)

### Community 26 - "Forms"
Cohesion: 0.18
Nodes (14): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+6 more)

### Community 27 - "sequence.test.ts"
Cohesion: 0.17
Nodes (16): SequenceBoard(), build(), createSequenceScenario(), createTestSequenceScenario(), isStepPermutation(), moveSequence(), SequenceContent, SequenceProvenance (+8 more)

### Community 28 - "Playwright E2E"
Cohesion: 0.19
Nodes (3): @playwright/test, topics, addPracticeRole()

### Community 29 - "Carousel"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 30 - "Button"
Cohesion: 0.22
Nodes (9): react-day-picker, Button, Calendar(), CalendarDayButton(), AboutPage(), PILLARS, Route, Home() (+1 more)

### Community 31 - "chart.tsx"
Cohesion: 0.24
Nodes (11): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+3 more)

### Community 32 - "lucide-react"
Cohesion: 0.36
Nodes (7): lucide-react, AccordionContent, AccordionItem, AccordionTrigger, FAQS, FaqsPage(), Route

### Community 33 - "training.ts"
Cohesion: 0.13
Nodes (29): PracticeState, Snapshot, devApi(), read(), seed(), Workspace, advanceSession(), answerSession() (+21 more)

### Community 34 - "navigation-menu.tsx"
Cohesion: 0.28
Nodes (8): @radix-ui/react-navigation-menu, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 35 - "breadcrumb.tsx"
Cohesion: 0.22
Nodes (8): @radix-ui/react-slot, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

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

### Community 40 - "ContactSection.tsx"
Cohesion: 0.48
Nodes (3): ContactSection(), Textarea, Route

### Community 41 - "core-integration.test.ts"
Cohesion: 0.32
Nodes (9): configuredFollowUp(), defaultModuleSettings(), generateConfiguredModule(), regenerateConfiguredScenario(), reviseConfiguredScenario(), defaultPracticeData, moduleWithCount(), practice() (+1 more)

### Community 43 - "training-types.ts"
Cohesion: 0.38
Nodes (6): LegacyOrderScenario, MatchingScenario, OrderScenario, OrderScenarioBase, StructuredOrderScenario, TrainingPackage

### Community 46 - "vite.config.ts"
Cohesion: 0.33
Nodes (5): nitro, @tailwindcss/vite, vite, vite-tsconfig-paths, @vitejs/plugin-react

### Community 50 - "router.tsx"
Cohesion: 0.33
Nodes (5): @tanstack/react-query, getRouter(), Register, routeTree, startInstance

### Community 51 - "tabs.tsx"
Cohesion: 0.40
Nodes (4): @radix-ui/react-tabs, TabsContent, TabsList, TabsTrigger

### Community 52 - "scroll-area.tsx"
Cohesion: 0.67
Nodes (3): @radix-ui/react-scroll-area, ScrollArea, ScrollBar

## Knowledge Gaps
- **29 isolated node(s):** `@fontsource/inter`, `@fontsource/plus-jakarta-sans`, `@hookform/resolvers`, `@tanstack/router-plugin`, `date-fns` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 395 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `training.test.ts`, `module-config.ts`, `cn`, `sidebar.tsx`, `local-procedures.test.ts`, `class-variance-authority`, `same-day-requests.test.ts`, `role-matching.test.ts`, `package.json`, `pagination.tsx`, `MarketingShell`, `command.tsx`, `Alerts & Toggles`, `utils.ts`, `Forms`, `sequence.test.ts`, `Carousel`, `Button`, `chart.tsx`, `lucide-react`, `navigation-menu.tsx`, `breadcrumb.tsx`, `drawer.tsx`, `ContactSection.tsx`, `tabs.tsx`, `scroll-area.tsx`?**
  _High betweenness centrality (0.291) - this node is a cross-community bridge._
- **What connects `@fontsource/inter`, `@fontsource/plus-jakarta-sans`, `@hookform/resolvers` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `training.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05284147557328016 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Frontend Dependencies` to `package.json`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.09859943977591036 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `cn` to `lucide-react`, `navigation-menu.tsx`, `breadcrumb.tsx`, `drawer.tsx`, `sidebar.tsx`, `ContactSection.tsx`, `class-variance-authority`, `pagination.tsx`, `tabs.tsx`, `command.tsx`, `scroll-area.tsx`, `Alerts & Toggles`, `utils.ts`, `Forms`, `Carousel`, `Button`, `chart.tsx`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `module-config.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09234972677595628 - nodes in this community are weakly interconnected._