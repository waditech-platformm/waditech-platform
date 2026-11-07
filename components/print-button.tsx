"use client";
import { Printer } from "lucide-react";
export function PrintButton({ label }: { label: string }) {
  return <button type="button" onClick={() => window.print()} className="no-print inline-flex h-11 items-center gap-2 rounded-xl bg-action px-5 text-sm font-semibold text-white hover:bg-action-hover"><Printer className="size-4" aria-hidden />{label}</button>;
}
