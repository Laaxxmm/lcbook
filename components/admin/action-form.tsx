"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import type { ButtonProps } from "@/components/ui/button";
import { SubmitButton } from "./submit-button";
import { IDLE, type ActionState } from "./types";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

// Multi-field admin mutation (dispatch AWB/courier, SKU create/edit, stock adjust, reject
// notice). Renders its input children, then the submit + inline error/success. Field markup is
// passed in so each caller controls its own layout while sharing pending + error handling.
export const inputCls =
  "w-full rounded-[10px] border border-lc-border bg-white px-3 py-2 text-[14px] text-lc-green-800 outline-none focus:border-lc-green-700 focus:ring-2 focus:ring-[rgba(14,59,46,0.15)]";

export function ActionForm({
  action,
  children,
  submitLabel,
  submitVariant = "primary",
  submitSize,
  confirm,
  className,
}: {
  action: Action;
  children: ReactNode;
  submitLabel: string;
  submitVariant?: ButtonProps["variant"];
  submitSize?: ButtonProps["size"];
  confirm?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="mt-2 rounded-[8px] bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && state.msg && (
        <p className="mt-2 rounded-[8px] bg-[rgba(14,59,46,0.06)] px-3 py-1.5 text-[13px] font-medium text-lc-green-800">
          {state.msg}
        </p>
      )}
      <div className="mt-3">
        <SubmitButton variant={submitVariant} size={submitSize} confirm={confirm}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
