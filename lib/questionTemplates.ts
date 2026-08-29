// A real gap this closes: the rating rubric used to be four hardcoded
// questions with no way for an admin to change them — every session asked
// the same four things whether or not they were the right four for that
// course. This is a library of vetted question angles an admin can toggle
// per session, covering course dimensions that actually differ (a lab-heavy
// course cares about "practical exposure"; a theory course may not).
// Single source of truth — the API's fallback default and the creation
// form's checkbox list both read from this.
export type QuestionTemplate = { id: string; label: string; defaultOn: boolean };

export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  { id: "pace", label: "The pace of teaching was appropriate", defaultOn: true },
  { id: "clarity", label: "Concepts were explained clearly", defaultOn: true },
  { id: "engagement", label: "The faculty encouraged questions and interaction", defaultOn: true },
  { id: "fairness", label: "Assessments were fair and well-aligned with what was taught", defaultOn: true },
  { id: "practical", label: "Practical/lab sessions reinforced the concepts taught", defaultOn: false },
  { id: "resources", label: "Course materials and resources were adequate", defaultOn: false },
  { id: "accessibility", label: "The faculty was approachable outside class hours", defaultOn: false },
  { id: "workload", label: "The workload was manageable within the course duration", defaultOn: false },
  { id: "punctuality", label: "Classes started and ended on time", defaultOn: false },
];

export const COMMENT_QUESTION = { id: "comment", type: "text" as const, label: "Anything else you'd like to share? (optional)" };

// The full question shape a session actually stores — a superset of the
// old {id, type: rating|text, label}. `options` only applies to `mcq`;
// `construct` only applies to `rating`. Kept as one type (rather than a
// discriminated union per type) because the creation form edits these
// interchangeably in one list before the type is finalized.
export type SessionQuestion = {
  id: string;
  type: "rating" | "mcq" | "text";
  label: string;
  options?: string[];
  // Groups this rating question with others sharing the same construct
  // name into one combined score — e.g. three differently-worded
  // questions all measuring "clarity" average into a single, less noisy
  // "Clarity" number instead of three separate ones. Psychometric term:
  // multi-item construct measurement (see e.g. SEEQ, a validated teaching-
  // evaluation instrument built the same way). Optional — a rating
  // question with no construct just displays on its own, as before.
  construct?: string;
};

// Ready-made 3-item constructs an admin can drop in with one click instead
// of hand-writing multiple differently-angled questions on the same
// dimension. Each replaces the equivalent single QUESTION_TEMPLATES entry
// (same construct name) with three items that triangulate it — reduces
// single-question noise (one bad mood, one ambiguous phrasing) without
// requiring the admin to design a battery from scratch.
export type ConstructTemplate = { name: string; questions: { id: string; label: string }[] };

export const CONSTRUCT_TEMPLATES: ConstructTemplate[] = [
  {
    name: "Clarity",
    questions: [
      { id: "clarity_pace", label: "Difficult topics were broken down step by step" },
      { id: "clarity_examples", label: "Examples helped me understand the concepts" },
      { id: "clarity_doubts", label: "My doubts were resolved clearly when I asked" },
    ],
  },
  {
    name: "Engagement",
    questions: [
      { id: "engagement_questions", label: "The faculty encouraged questions during class" },
      { id: "engagement_interest", label: "The way the material was taught kept me interested" },
      { id: "engagement_participation", label: "I felt comfortable participating in class" },
    ],
  },
  {
    name: "Fairness",
    questions: [
      { id: "fairness_alignment", label: "Assessments matched what was actually taught" },
      { id: "fairness_grading", label: "Grading felt consistent and unbiased" },
      { id: "fairness_expectations", label: "Expectations for assignments were made clear in advance" },
    ],
  },
];

export function defaultQuestions(): SessionQuestion[] {
  return [
    ...QUESTION_TEMPLATES.filter((q) => q.defaultOn).map((q) => ({ id: q.id, type: "rating" as const, label: q.label })),
    COMMENT_QUESTION,
  ];
}

// Derives a short, stable analytics key from a free-typed label — e.g.
// "How often did you attend lab sessions?" -> "how_often_did". Analytics
// tables and the insight generator display this key capitalized as the
// column/dimension name, so it needs to read like a short label, not a
// hash. Collisions (two questions reducing to the same slug) get a
// numeric suffix so they never silently overwrite one another in the
// stored jsonb.
export function slugifyQuestionId(label: string, existingIds: string[]): string {
  const words = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  const base = words.length > 0 ? words.join("_") : "question";
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
