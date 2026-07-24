"use client";

import { useActionState } from "react";
import { editOrderAddress } from "@/app/admin/(panel)/actions";
import { SubmitButton } from "./submit-button";
import { inputCls } from "./action-form";
import { IDLE, type ActionState } from "./types";

// Admin: edit the delivery address + courier contact (§14). Prefilled from the order; the action
// is audited (writes an OrderEvent). orderId is bound here so the server action keeps its
// editOrderAddress(orderId, formData) signature while still driving useActionState's inline
// error/success handling.
type Props = {
  orderId: string;
  addrLine1: string;
  addrLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  customerPhone: string;
};

export function EditAddressForm(p: Props) {
  const [stateResult, formAction] = useActionState(
    (_prev: ActionState, fd: FormData) => editOrderAddress(p.orderId, fd),
    IDLE,
  );

  return (
    <form action={formAction}>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">Edit delivery address</h2>
      <div className="mt-3 grid gap-2">
        <input name="addrLine1" defaultValue={p.addrLine1} placeholder="Address line 1" className={inputCls} required />
        <input name="addrLine2" defaultValue={p.addrLine2 ?? ""} placeholder="Address line 2 (optional)" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input name="city" defaultValue={p.city} placeholder="City" className={inputCls} required />
          <input name="state" defaultValue={p.state} placeholder="State" className={inputCls} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input name="pincode" defaultValue={p.pincode} placeholder="Pincode" inputMode="numeric" className={inputCls} required />
          <input name="customerPhone" defaultValue={p.customerPhone} placeholder="Courier contact phone" inputMode="tel" className={inputCls} required />
        </div>
      </div>
      {stateResult.error && (
        <p role="alert" className="mt-2 rounded-[8px] bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-700">
          {stateResult.error}
        </p>
      )}
      {stateResult.ok && stateResult.msg && (
        <p className="mt-2 rounded-[8px] bg-[rgba(14,59,46,0.06)] px-3 py-1.5 text-[13px] font-medium text-lc-green-800">
          {stateResult.msg}
        </p>
      )}
      <div className="mt-3">
        <SubmitButton variant="primary" size="sm" confirm="Update the delivery address on this order?">
          Save address
        </SubmitButton>
      </div>
    </form>
  );
}
