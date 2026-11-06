import Image from "next/image";

/** Trainer photo, or a calm initial tile when no photo has been provided. */
export function TrainerAvatar({ name, photo, size = 64, className = "" }: { name: string; photo: string | null; size?: number; className?: string }) {
  const initial = name.replace(/\(.*?\)/g, "").trim().slice(0, 1).toUpperCase();
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-royal-50 font-bold text-royal-700 ring-1 ring-line ${className}`} style={{ width: size, height: size, fontSize: size / 2.6 }}>
      {photo ? <Image src={photo} alt="" fill sizes={`${size}px`} className="object-cover" /> : <span aria-hidden>{initial}</span>}
    </span>
  );
}
