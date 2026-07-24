import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Small shared admin primitives (§14, §16 tokens). Server components — no client JS.

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-lc-green-800">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-lc-green-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[14px] border border-lc-border bg-white p-5", className)} {...props} />;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-dashed border-lc-border bg-white/50 px-5 py-10 text-center text-[15px] text-lc-green-400">
      {children}
    </div>
  );
}

/** Responsive table wrapper — scrolls horizontally rather than overflowing the page at 360px. */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-lc-border bg-white">
      <table className="w-full min-w-[640px] border-collapse text-[14px]">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn("border-b border-lc-border px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-lc-green-400", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-lc-border px-4 py-2.5 align-top text-lc-green-800", className)}>{children}</td>;
}

/** Key/value row for detail panels. */
export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-t border-lc-border py-2 first:border-t-0">
      <span className="text-lc-green-400">{k}</span>
      <span className="text-right font-semibold text-lc-green-800">{v}</span>
    </div>
  );
}
