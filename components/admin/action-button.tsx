"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import type { ButtonProps } from "@/components/ui/button";
import { SubmitButton } from "./submit-button";
import { IDLE, type ActionState } from "./types";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

// One-click admin mutation: a tiny <form> carrying hidden fields, driven by a server action.
// Surfaces the action's error inline. Used for status advances, print steps, retries, etc.
export function ActionButton({
  action,
  hidden,
  children,
  variant,
  size,
  confirm,
  className,
}: {
  action: Action;
  hidden?: Record<string, string>;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  confirm?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  return (
    <form action={formAction} className="inline-block">
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton variant={variant} size={size} confirm={confirm} className={className}>
        {children}
      </SubmitButton>
      {state.error && (
        <p role="alert" className="mt-1 text-[12px] font-medium text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
