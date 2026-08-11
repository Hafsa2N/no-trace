import { analyzeComments } from "../lib/analysis/index.ts";

const comments = [
  "The pace was too fast and I could not keep up with the concepts.",
  "Loved the teaching style, very clear and engaging.",
  "The course was okay, assessments could be fairer though.",
  "More hands-on labs would help, but overall good experience.",
  "Great improvements this term, really enjoyed the practical demos.",
];

console.log(JSON.stringify(analyzeComments(comments), null, 2));
