# No Trace

**An anonymous academic feedback platform where identity verification and feedback storage are structurally separated — not by policy, by database design.**

Students verify eligibility with a roll number and a one-time email code. Their response is then stored against an opaque, single-use token that carries no reference back to who they are. There is no foreign key, no shared row, and no code path anywhere in the system that can join a response back to a student — not because access is restricted, but because the link does not exist to look up.

Built for Indian colleges running per-subject, per-class feedback cycles (a QR code per class, not per subject), with role-based dashboards for faculty, department admins, and institutional administrators.

**Live:** [anon-feedback-iota.vercel.app](https://anon-feedback-iota.vercel.app)

---

## Why this is more than a form builder

Most "anonymous feedback" tools are a Google Form with the name field removed — anonymity by omission, not by architecture. This project treats anonymity as a system property that has to be designed and then verified, not assumed:

- **Identity and response tables share no foreign key.** `students` / `session_participants` / `otp_codes` know *who*; `tokens` / `responses` know *what*. The only column in common is `session_id`. See [`db/schema.sql`](db/schema.sql).
- **Roll numbers are never stored in plaintext against a session.** Participation is recorded as `HMAC-SHA256(session_id : roll_number, server_secret)` — keyed, not a bare hash, so it can't be brute-forced against a known roster even with full database access, and salted per-session so one student's participation can't be correlated across sessions.
- **The OTP-to-identity link is deleted the instant it's no longer needed** — not at the end of the request, at the earliest point verification succeeds — closing the window where a plaintext roll-number-to-session record could exist at all.
- **Small cohorts are protected from re-identification by elimination**, not just by hiding a name. Comments are withheld until ≥5 students have responded; department/course response-rate rollups are suppressed below the same threshold. This is enforced in the data layer (`lib/sessionAnalytics.ts`), not only in the UI — so a future API route can't accidentally leak what a page correctly hides.
- **Every authorization check is server-side and independently verified**, including a session-expiry gap found and fixed during development: a token minted while a feedback window was open could previously be redeemed indefinitely after it closed, since nothing checked the window at submission time. Fixed by making `sessions.closes_at` the single authoritative boundary, checked identically at OTP request, OTP verification, and submission — not duplicated as a second, driftable source of truth.

## Real analytics, honestly labeled

- **Response-rate confidence tiers** based on published course-evaluation research (rates under 40% show significantly different score distributions than 50–75%; under 66% introduces meaningful sampling bias) — not an arbitrary cutoff, and labeled "evidence level," not "confidence," because it's a threshold rule, not a computed statistical confidence interval.
- **Sentiment scoring** via the AFINN-165 lexicon and **theme tagging** via a transparent, hand-authored keyword dictionary — both deterministic and fully inspectable, deliberately not an LLM call: no API cost, no per-request latency, and a college administrator can read the source and know exactly why a comment was tagged the way it was.
- **Representative-comment extraction** via TextRank (graph-based sentence ranking), not a model summarizing potentially-identifying free text.
- **Cross-term trend detection** — response rates and recurring comment themes tracked term-over-term per course, pooled correctly (total responses ÷ total eligible across every section, never an average of each section's own percentage, which would silently misweight a 5-student section the same as a 60-student one).
- Every chart has an explicit "not enough data yet" state instead of a fabricated trend line — a single term of data renders as a stated fact, never a one-point "trend."

## Architecture

**Next.js 16 (App Router, Turbopack) · TypeScript · Neon serverless Postgres (raw SQL, no ORM) · Tailwind v4**

- **Auth**: JWT in an `httpOnly`, `SameSite=Lax` cookie for staff sessions; bcrypt password hashing; server-checked role (`admin` / `faculty`) on every protected route — verified against the database on each request, not just at login, so deactivating an account takes effect immediately rather than at next token expiry.
- **Rate limiting**: a Postgres-backed sliding-window limiter (serverless functions don't share in-memory state across invocations), applied per-account and per-IP on every credential-guessing surface — admin login, OTP request, OTP verify, password reset.
- **Testing**: Vitest, currently covering the authorization-boundary logic (session-window rules), sentiment/theme/TextRank analysis, and response-confidence classification — the modules where a silent regression would be a correctness or privacy failure, not just a cosmetic bug.
- **Design system**: a single token-driven theme (`app/globals.css`) carried consistently from the marketing page through the authenticated dashboard — same palette, type scale, and component set everywhere, audited explicitly against introducing inconsistent one-off styling.

## What's shipped

- Class-level sessions: one QR code per class, one verification, one combined form covering every subject taught to that class in a single sitting.
- Roster upload (`.xlsx`), OTP email verification, DPDP-style consent capture, race-safe one-submission enforcement (atomic primary-key insert, not an application-level check).
- Self-service data rights at `/my-data` — a student can view or delete their own roster record without an account.
- Institutional, department, and per-course dashboards: pooled response-rate trends, question-level rating breakdowns (ranked, not just averaged), MCQ distributions, sentiment, recurring themes, and an admin-configurable question library (single questions plus validated 3-item "construct" batteries that average out single-question noise the way instruments like SEEQ do).
- Comment moderation, a categorized/severity-tagged admin audit log, and role-scoped access enforced at the query level (faculty only ever see their own subject's results).

## Deliberately deferred

LLM-based analysis (the deterministic pipeline above covers sentiment/topics/summarization without one), ERP/LMS roster auto-sync, SMS OTP, true multi-tenant SaaS (this app is single-tenant by design — one deployment per institution, its own database, no shared data).

---

## Running it locally

```bash
git clone https://github.com/<your-username>/no-trace.git
cd no-trace
npm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET, an email option
npm run dev
```

### 1. Database

Create a free project at [neon.tech](https://neon.tech), copy the connection string into `.env.local` as `DATABASE_URL`, then apply the schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

(No `psql`? Paste `db/schema.sql` into the Neon SQL editor instead.)

### 2. Email delivery (optional for local dev)

Without either option, OTP codes print to the server console — fine for local testing, not for real students. Pick one:

- **Resend** (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) — needs a verified domain to send beyond your own inbox.
- **Gmail SMTP** (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, an [app password](https://myaccount.google.com/apppasswords), not your normal one) — works with any Gmail account, no domain required.

### 3. Secrets

```bash
openssl rand -base64 32   # → AUTH_SECRET
```

### 4. First admin account

Visit `/setup` once the app is running — a one-time page that creates the first admin account, then permanently disables itself. Or, with direct database access:

```bash
node --env-file=.env.local scripts/create-admin.mjs you@college.edu "a-strong-password" admin
```

### 5. Run

```bash
npm run dev
```

Visit `http://localhost:3000`. Log in at `/admin/login`, upload a roster at `/admin/roster` (`scripts/generate-sample-roster.mjs` produces a synthetic `sample-roster.xlsx` with no real student data), then create a session at `/admin/sessions/new`.

### Tests

```bash
npm test
```

## Deploying

Push to GitHub, import the repo into [Vercel](https://vercel.com), set the same environment variables (with `NEXT_PUBLIC_BASE_URL` pointed at your production URL) in the Vercel project settings. No build configuration needed beyond the framework defaults. Every push to the connected branch redeploys automatically.

## Known limitations

- Free-tier serverless hosting is used as-is; Neon's free tier has no automated backups — export periodically before a real pilot with real data.
- The `xlsx` package carries a known unfixed advisory (prototype pollution / ReDoS). Roster upload is admin-only and intended for trusted institutional files — don't expose that endpoint to untrusted uploads.
- This is an actively developed project, not a frozen snapshot — see commit history for what's changed since this README was last updated.
