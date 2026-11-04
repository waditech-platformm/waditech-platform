"use client";
import { Printer } from "lucide-react";
export function PrintButton({ label }: { label: string }) {
  return <button type="button" onClick={() => window.print()} className="no-print inline-flex h-11 items-center gap-2 rounded-xl bg-royal-600 px-5 text-sm font-semibold text-white hover:bg-royal-700"><Printer className="size-4" aria-hidden />{label}</button>;
}
