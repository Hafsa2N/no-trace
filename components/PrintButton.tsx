"use client";

import { Printer } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClasses("primary", "sm")}>
      <Printer className="h-3.5 w-3.5" />
      Print / Save as PDF
    </button>
  );
}
