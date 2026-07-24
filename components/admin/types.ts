// Shared result shape for admin server actions (kept out of the "use server" module so it can
// be imported by client components without violating the actions-only export rule).
export type ActionState = { ok?: boolean; error?: string; msg?: string };
export const IDLE: ActionState = {};
