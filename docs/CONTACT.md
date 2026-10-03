# Public contact form

The dedicated `/contact` page contains the single contact form. The homepage final CTA and all public Contact Us links navigate there. Public page navigation includes Contact Us; the logged-in application shell is unchanged.

Submission uses the public TanStack server route `POST /api/contact`, backed by
`src/lib/contact-handler.ts`, the existing Supabase connection and `public.contact_messages` table.
It writes only after server validation. The optional GP practice is included as a labelled prefix
in the existing message column, respecting its 2,000-character limit. No database schema change
is required. The UI limits the message itself to 1,800 characters to leave room for that prefix.

The existing table migration is `drizzle/migrations/0000_create_contact_messages.sql`. It permits public inserts but no public reads. If the table has not been deployed to the connected Supabase project, apply that existing migration; do not create another message store. Supabase public URL/key configuration is the same as before.

Messages are stored in Supabase, not emailed. The team should review `contact_messages` in the Supabase dashboard. No notification service was added. A hidden honeypot blocks simple bots using the form; this is basic friction, not rate limiting or CAPTCHA protection for the public database endpoint.

Validation, optional-field formatting, backend errors and the Supabase REST insert are covered by `node --experimental-strip-types tests/contact.test.ts`. Browser tests exercise validation, pending/success/error states and navigation using a simulated server response. Before release, send one test message on the deployed site and verify its row (including the optional practice name) in the intended Supabase project, then delete that test row.

Public styles are scoped under the marketing layout. Local reception photography and its licence/source notes are listed in `docs/PHOTOGRAPHY.md`.
