import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The official logo in the version that suits the current theme.
 * - light: logo-original-*.png, the owner's file, byte-for-byte.
 * - dark:  logo-dark-*.png, identical except the navy "LEARN • BUILD • INNOVATE" tagline is
 *          recoloured light so it stays legible (generated from logo-original.png; see docs/DESIGN_SYSTEM.md).
 * CSS in globals.css (.wt-logo) shows exactly one of them, so switching themes needs no JavaScript.
 */
export function BrandLogo({ alt, size = 480, className, priority }: { alt: string; size?: 480 | 960; className?: string; priority?: boolean }) {
  const h = size === 960 ? 640 : 320;
  return (
    <span className="wt-logo">
      <Image src={`/media/brand/logo-original-${size}.png`} alt={alt} width={size} height={h} priority={priority} className={cn("wt-logo-light", className)} />
      {/* the dark copy loads only when shown (display:none images are not fetched while lazy) */}
      <Image src={`/media/brand/logo-dark-${size}.png`} alt={alt} width={size} height={h} loading="lazy" className={cn("wt-logo-dark", className)} />
    </span>
  );
}
