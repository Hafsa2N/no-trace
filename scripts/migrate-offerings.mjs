import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("1. Creating session_offerings table...");
  await sql.query(`
    create table if not exists session_offerings (
      id uuid primary key default gen_random_uuid(),
      session_id uuid not null references sessions(id),
      course_id uuid references courses(id),
      assigned_faculty uuid references admins(id),
      created_at timestamptz not null default now()
    )
  `);

  console.log("2. Migrating each existing session into one offering...");
  const sessionsRes = await sql.query(
    "select id, course_id, assigned_faculty from sessions"
  );
  const sessions = sessionsRes.rows ?? sessionsRes;
  console.log(`   found ${sessions.length} sessions to migrate`);

  const sessionIdToOfferingId = new Map();
  for (const s of sessions) {
    const insertRes = await sql.query(
      "insert into session_offerings (session_id, course_id, assigned_faculty) values ($1, $2, $3) returning id",
      [s.id, s.course_id, s.assigned_faculty]
    );
    const offeringId = (insertRes.rows ?? insertRes)[0].id;
    sessionIdToOfferingId.set(s.id, offeringId);
  }
  console.log(`   created ${sessionIdToOfferingId.size} offerings`);

  console.log("3. Adding responses.session_offering_id...");
  await sql.query("alter table responses add column if not exists session_offering_id uuid references session_offerings(id)");

  console.log("4. Backfilling responses.session_offering_id from session_id...");
  const responsesRes = await sql.query("select id, session_id from responses");
  const responses = responsesRes.rows ?? responsesRes;
  console.log(`   found ${responses.length} responses to backfill`);
  for (const r of responses) {
    const offeringId = sessionIdToOfferingId.get(r.session_id);
    if (!offeringId) {
      throw new Error(`No offering found for response ${r.id} (session_id ${r.session_id})`);
    }
    await sql.query("update responses set session_offering_id = $1 where id = $2", [offeringId, r.id]);
  }

  console.log("5. Verifying every response now has session_offering_id set...");
  const nullCheck = await sql.query("select count(*) from responses where session_offering_id is null");
  const nullCount = (nullCheck.rows ?? nullCheck)[0].count;
  if (Number(nullCount) !== 0) {
    throw new Error(`${nullCount} responses still have null session_offering_id — aborting before dropping old column`);
  }
  console.log("   all responses backfilled correctly");

  console.log("6. Making session_offering_id NOT NULL and dropping old session_id column on responses...");
  await sql.query("alter table responses alter column session_offering_id set not null");
  await sql.query("alter table responses drop column if exists session_id");

  console.log("7. Dropping subject/course_id/assigned_faculty from sessions (now live on session_offerings)...");
  await sql.query("alter table sessions drop column if exists subject");
  await sql.query("alter table sessions drop column if exists course_id");
  await sql.query("alter table sessions drop column if exists assigned_faculty");

  console.log("8. Adding index for offering lookups...");
  await sql.query("create index if not exists idx_session_offerings_session on session_offerings(session_id)");
  await sql.query("create index if not exists idx_session_offerings_course on session_offerings(course_id)");
  await sql.query("create index if not exists idx_responses_offering on responses(session_offering_id)");

  console.log("Migration complete.");
}

main().catch((err) => {
  console.error("MIGRATION FAILED:", err);
  process.exit(1);
});
