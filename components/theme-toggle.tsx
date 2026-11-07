"use client";
import { useRef, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";
export const THEME_COOKIE = "wt_theme";
const THEME_COLOR: Record<Theme, string> = { light: "#ffffff", dark: "#071224" };

const OS_DARK = "(prefers-color-scheme: dark)";
/** The theme on screen: the visitor's saved choice, else their OS setting (globals.css follows it too). */
export const currentTheme = (): Theme => {
  const t = document.documentElement.dataset.theme;
  if (t === "dark" || t === "light") return t;
  return window.matchMedia(OS_DARK).matches ? "dark" : "light";
};
const read = currentTheme;
/** Notifies on a theme change from either source: the toggle (data-theme) or the OS setting. */
export const subscribeTheme = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = window.matchMedia(OS_DARK);
  mq.addEventListener("change", cb);
  return () => { mo.disconnect(); mq.removeEventListener("change", cb); };
};
const subscribe = subscribeTheme;

function commit(next: Theme) {
  const root = document.documentElement;
  root.dataset.theme = next;
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[next]);
}

/** Light / dark switch. The new theme grows out of the button as a circle (View Transitions), or cross-fades. */
export function ThemeToggle({ toDark, toLight, className }: { toDark: string; toLight: string; className?: string }) {
  // Server render can't know the theme; the client snapshot corrects the icon right after hydration.
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  const btn = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    const next: Theme = read() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) {
      root.classList.add("wt-theming");
      commit(next);
      window.setTimeout(() => root.classList.remove("wt-theming"), 400);
      return;
    }
    const r = btn.current?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : innerWidth / 2;
    const y = r ? r.top + r.height / 2 : 0;
    root.style.setProperty("--wt-x", `${x}px`);
    root.style.setProperty("--wt-y", `${y}px`);
    root.style.setProperty("--wt-r", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
    document.startViewTransition(() => commit(next));
  };

  const label = theme === "dark" ? toLight : toDark;
  return (
    <button
      ref={btn}
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn("relative grid size-10 place-items-center overflow-hidden rounded-xl text-navy-900 ring-1 ring-line transition-colors hover:bg-surface", className)}
    >
      {/* the two icons swap with a short turn, so the control shows what changed */}
      <Sun aria-hidden className={cn("absolute size-5 transition-all duration-300", theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0")} />
      <Moon aria-hidden className={cn("absolute size-5 transition-all duration-300", theme === "dark" ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100")} />
    </button>
  );
}
