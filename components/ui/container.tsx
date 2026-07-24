import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Page container — max-width 1140px, 24px side padding (§16). */
export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-container px-6", className)} {...props} />;
}
