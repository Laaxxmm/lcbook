"use client";

import { Button } from "@/components/ui/button";

// Tiny client island: the whole shipping-label page is a server component; only this needs
// window.print(). Tagged no-print so it never appears on the printed cover.
export function PrintButton() {
  return (
    <Button variant="secondary" size="sm" className="no-print" onClick={() => window.print()}>
      Print label
    </Button>
  );
}
