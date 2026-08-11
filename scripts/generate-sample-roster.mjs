// Dev-only fixture generator, not part of the app.
import * as XLSX from "xlsx";

const rows = [
  { roll_number: "CSE3A01", name: "Aarav Sharma", department: "CSE", year: 3, section: "A", email: "cse3a01@test-college.edu" },
  { roll_number: "CSE3A02", name: "Diya Patel", department: "CSE", year: 3, section: "A", email: "cse3a02@test-college.edu" },
  { roll_number: "CSE3A03", name: "Kabir Khan", department: "CSE", year: 3, section: "A", email: "cse3a03@test-college.edu" },
  { roll_number: "CSE3A04", name: "Ananya Iyer", department: "CSE", year: 3, section: "A", email: "cse3a04@test-college.edu" },
  { roll_number: "CSE3A05", name: "Rohan Gupta", department: "CSE", year: 3, section: "A", email: "cse3a05@test-college.edu" },
  { roll_number: "CSE3A06", name: "Ishita Reddy", department: "CSE", year: 3, section: "A", email: "cse3a06@test-college.edu" },
  { roll_number: "CSE3A07", name: "Vihaan Nair", department: "CSE", year: 3, section: "A", email: "cse3a07@test-college.edu" },
  { roll_number: "CSE3A08", name: "Sanya Verma", department: "CSE", year: 3, section: "A", email: "cse3a08@test-college.edu" },
];

const sheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, "Roster");
XLSX.writeFile(workbook, "sample-roster.xlsx");
console.log(`Wrote sample-roster.xlsx with ${rows.length} students.`);
