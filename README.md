# Anonymous Academic Feedback — MVP

Identity verification and feedback storage are architecturally separated: the
`students` / `session_participants` / `otp_codes` tables know *who*, the
`tokens` / `responses` tables know *what* — and the only column they share is
`session_id`. See [`db/schema.sql`](db/schema.sql) for the full design and
[`app/privacy/page.tsx`](app/privacy/page.tsx) for the student-facing
explanation.

## Stack (free tier)

- **Next.js 16** (App Router) — frontend + API routes, deploy to Vercel free tier
- **Neon** — serverless Postgres, free tier, auto-resumes on connection
- **Resend** — OTP emails, free tier (100/day). Falls back to console logging
  in dev if no API key is set.

## 1. Set up Neon

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the connection string into `.env.local` as `DATABASE_URL`.
3. Apply the schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

(No `psql`? Paste the contents of `db/schema.sql` into the Neon SQL editor in
the dashboard instead.)

## 2. Set up Resend (optional for local dev)

1. Create a free account at [resend.com](https://resend.com), grab an API key.
2. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env.local`.
3. Without a key, OTP codes are printed to the server console instead of
   emailed — fine for local testing, not for a real pilot.

## 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and generate
`AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## 4. Create your first admin account

**Deploying somewhere without shell access (e.g. Vercel)?** Once the app is
running, visit `/setup` — a one-time web page that creates the first admin
account. It works exactly once: the moment any admin account exists, the
page and its API permanently refuse to create another one, so it can't be
used as a backdoor later. Add more admin/faculty accounts from within the
app (or via the CLI script below) after that.

**Have shell access to the same database?**

```bash
node --env-file=.env.local scripts/create-admin.mjs you@college.edu "a-strong-password" admin
```

## 5. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Log in at `/admin/login`, upload a roster
(`.xlsx` with columns `roll_number, name, department, year, section, email`)
at `/admin/roster`, then create a session at `/admin/sessions/new`.

## 6. Deploy

Push to a Git repo, import into Vercel, add the same environment variables
(set `NEXT_PUBLIC_BASE_URL` to your production URL) in the Vercel project
settings. No build config needed beyond the defaults.

## What's shipped

- **Class-level sessions**: one QR code per class (e.g. CSE Year 3 Section
  A), one verification, one combined form covering every subject taught to
  that class in one sitting — not a separate QR code per subject.
- Roster upload, OTP email verification, DPDP-style consent capture,
  race-safe one-submission enforcement, anonymous submission.
- Self-service data rights at `/my-data` — a student can view or delete
  their own roster record without an account, same OTP pattern as feedback.
- Aggregate analytics per subject with a minimum-N threshold before
  comments are shown, response-rate confidence tiers (research-backed
  66%/40% cutoffs, not a guess), sentiment (AFINN lexicon), keyword-based
  theme tagging, and TextRank-based representative-comment extraction —
  all deterministic, no LLM, no API cost.
- **Cross-semester trend detection** at `/admin/courses/[id]`: recurring
  themes tracked across terms, flagged unresolved unless an `/admin/updates`
  entry was explicitly linked to that course — this only works because
  sessions resolve to a stable `course_id`/`term_id` instead of free text.
- Comment moderation, an admin action audit log, and role-scoped access
  (faculty only ever see their own subject's results, never a colleague's,
  enforced at the query level).

## Deliberately deferred

AI-generated question sets, conversational feedback UI, LLM-based analysis
(the deterministic pipeline above covers sentiment/topics/summarization
without one), ERP/LMS roster auto-sync, SMS OTP, true multi-tenant SaaS
(this app is built for one college per deployment — see "Deploying for
another college" below).

## Deploying for another college

This app is single-tenant by design — each college runs its own copy with
its own database. To stand up a new instance: fork/clone this repo, follow
steps 1–6 above for a fresh Neon project, and use `/setup` to create that
college's first admin account. There's no shared data between deployments.

## Known limitations to flag before a real pilot

- Free-tier hosting can cold-start; keep a low-traffic uptime ping running
  during active feedback windows if you're not on Vercel's serverless
  functions (which don't sleep).
- The `xlsx` package has a known unfixed advisory (prototype pollution /
  ReDoS). Roster upload is admin-only and meant for trusted institutional
  files, but don't expose that endpoint to untrusted uploads.
- No automated backups on free-tier Neon — export periodically if you're
  running a real pilot with real data.
