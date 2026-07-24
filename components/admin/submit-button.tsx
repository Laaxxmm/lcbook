"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

// Submit button that disables + shows progress while its parent <form> action is pending.
// Optional `confirm` gates irreversible mutations (dispatch, refund, deactivate) with a
// native confirm dialog before the action fires.
export function SubmitButton({
  children,
  confirm,
  pendingLabel = "Working…",
  ...props
}: ButtonProps & { confirm?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      onClick={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}
      {...props}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
