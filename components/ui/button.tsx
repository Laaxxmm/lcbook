"use client";

import type { ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// §16: gold CTA fill #E8A33D, text #3A2A08 (never white — fails WCAG), radius 999px,
// padding 12px 20px, weight 700, 15px. Nav-link size mirrors §16 (14.5px/600, radius 10px).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-bold text-[15px] leading-none transition-[filter,background-color,color] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(14,59,46,0.4)]",
  {
    variants: {
      variant: {
        primary: "bg-lc-gold text-lc-on-gold hover:brightness-95",
        secondary: "bg-lc-green-800 text-lc-cream hover:bg-lc-green-700",
        outline:
          "border border-lc-border bg-transparent text-lc-green-800 hover:bg-[rgba(14,59,46,0.06)]",
        ghost: "bg-transparent text-lc-green-800 hover:bg-[rgba(14,59,46,0.06)]",
      },
      size: {
        default: "px-5 py-3",
        sm: "rounded-[10px] px-[13px] py-[9px] text-[14.5px] font-semibold",
        lg: "px-6 py-3.5 text-base",
        // Prominent sticky-bar CTA (§16 item 5) — taller, bolder.
        xl: "px-7 py-4 text-[17px] font-extrabold",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
