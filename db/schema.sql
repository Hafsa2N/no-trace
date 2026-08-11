-- Anonymous Academic Feedback Platform — schema
--
-- Design principle: identity and feedback must never share a row, a table,
-- or a foreign key. `students` and `session_participants` know WHO acted.
-- `tokens` and `responses` know WHAT was submitted. The only column they
-- have in common is session_id — there is no path from a response back to
-- a student.

create extension if not exists pgcrypto;

-- ============ IDENTITY SIDE ============

create table students (
  roll_number   text primary key,
  name          text not null,
  department    text not null,
  year          int not null,
  section       text not null,
  email         text not null,
  -- Set the first time this student actively consents (roll-number entry
  -- step), not at roster upload — the roster only reflects the college's
  -- own enrollment record-keeping, not this student's individual consent
  -- to have their data processed by this specific system. Required under
  -- India's DPDP Act 2023.
  consent_given_at timestamptz,
  created_at    timestamptz not null default now()
);

create table admins (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  role          text not null check (role in ('admin', 'faculty')),
  created_at    timestamptz not null default now()
);

-- Canonical course identity. Sessions reference a course rather than
-- storing subject as free text, so "DBMS" typed three different ways
-- across three semesters doesn't fragment the trend data that's the whole
-- point of collecting this over time.
create table courses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  department    text not null,
  created_at    timestamptz not null default now(),
  unique (name, department)
);

-- Explicit academic term, rather than inferring "which semester" from a
-- session's timestamp — academic terms don't align cleanly to calendar
-- boundaries, and a late makeup session would land in the wrong bucket.
create table terms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique, -- e.g. "Fall 2025"
  starts_at     date not null,
  ends_at       date not null,
  created_at    timestamptz not null default now()
);

-- A session is one QR code / one verification for an entire class (e.g.
-- CSE Year 3 Section A) for a time window — a student verifies once and
-- rates every subject taught to that class in one sitting, instead of
-- scanning a separate QR code per subject.
create table sessions (
  id              uuid primary key default gen_random_uuid(),
  department      text not null,
  year            int not null,
  section         text not null,
  passcode        text not null unique,
  questions       jsonb not null, -- shared rubric applied to every subject: [{id, type: 'rating'|'text', label}]
  opens_at        timestamptz not null,
  closes_at       timestamptz not null,
  created_by      uuid references admins(id),
  term_id         uuid references terms(id),
  created_at      timestamptz not null default now()
);

-- One row per subject taught to that class within the session — this is
-- what used to be a whole session on its own. Splitting it out here is
-- what lets one QR code cover a class's entire timetable while keeping
-- each subject's ratings correctly attributed to its own course and
-- faculty for per-faculty views and cross-term trend analysis.
create table session_offerings (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references sessions(id),
  course_id       uuid references courses(id),
  -- Which faculty account this offering's results belong to. Faculty can
  -- only ever see offerings assigned to them — not their colleagues'
  -- subjects in the same class session — enforced at the query level, not
  -- just hidden in the UI.
  assigned_faculty uuid references admins(id),
  created_at      timestamptz not null default now()
);

-- One row per student who has verified/submitted for a session.
-- Stores only a salted hash of the roll number, never the roll number
-- itself, so this table cannot be reverse-joined to `students` without
-- brute-forcing the hash for every roster entry.
create table session_participants (
  session_id      uuid not null references sessions(id),
  roll_number_hash text not null,
  created_at      timestamptz not null default now(),
  primary key (session_id, roll_number_hash)
);

create table otp_codes (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id),
  roll_number   text not null,
  code_hash     text not null,
  expires_at    timestamptz not null,
  consumed      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Separate from otp_codes on purpose: this OTP is for the self-service
-- data-rights flow (view/delete your own roster record), not for
-- verifying eligibility for a specific feedback session, so it isn't
-- scoped to a session_id at all.
create table my_data_otp_codes (
  id            uuid primary key default gen_random_uuid(),
  roll_number   text not null,
  code_hash     text not null,
  expires_at    timestamptz not null,
  consumed      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Who did what administrative action, when. Deliberately never references
-- responses or the identity/feedback link — only staff-side actions, never
-- feedback linkage.
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references admins(id),
  action        text not null,
  target_id     text,
  details       jsonb,
  created_at    timestamptz not null default now()
);

-- One student-visible record of "here's what changed because of past
-- feedback" — addresses the pain point that students stop bothering with
-- feedback once it feels like it disappears into a void.
create table updates (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  department    text, -- null means college-wide
  -- Optional: ties this update to the specific course it addresses, so the
  -- recurring-issue detector can tell whether a repeatedly-mentioned theme
  -- ever actually got a recorded institutional response.
  course_id     uuid references courses(id),
  created_by    uuid references admins(id),
  created_at    timestamptz not null default now()
);

-- ============ ANONYMOUS SIDE ============

-- Minted after OTP verification. Carries no identity information at all.
create table tokens (
  token         text primary key,
  session_id    uuid not null references sessions(id),
  used          boolean not null default false,
  created_at    timestamptz not null default now(),
  used_at       timestamptz
);

create table responses (
  id            uuid primary key default gen_random_uuid(),
  -- References the subject offering, not the class session directly — a
  -- response is always for one subject, even though a student answers for
  -- several offerings in one anonymous submission.
  session_offering_id uuid not null references session_offerings(id),
  ratings       jsonb not null,  -- {questionId: 1-5}
  comment       text,
  -- Lets staff hide a harmful/identifying comment from aggregate views
  -- without touching the ratings or deleting the response entirely.
  comment_hidden boolean not null default false,
  created_at    timestamptz not null default now()
);

create index on otp_codes (session_id, roll_number);
create index on session_offerings (session_id);
create index on session_offerings (course_id);
create index on responses (session_offering_id);
