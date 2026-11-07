import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Media storage adapter.
 *  - "supabase": Supabase Storage bucket `media` (production / staging).
 *  - "local": writes to public/uploads (local development only).
 * Every upload is validated by MAGIC BYTES (not the client-sent type), size-limited, renamed,
 * and images are re-encoded to WebP with all metadata (EXIF/GPS) stripped: important for children's privacy.
 */
const LIMITS = { image: 5 * 1024 * 1024, video: 50 * 1024 * 1024 };

export function sniff(buf: Buffer): "jpeg" | "png" | "webp" | "mp4" | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  if (buf.subarray(4, 8).toString() === "ftyp") return "mp4";
  return null;
}

export type Stored = { url: string; kind: "image" | "video"; width?: number; height?: number; bytes: number; mime: string };

export async function storeUpload(file: File): Promise<Stored> {
  const raw = Buffer.from(await file.arrayBuffer());
  const type = sniff(raw);
  if (!type) throw new Error("unsupported_type");
  const kind = type === "mp4" ? "video" : "image";
  if (raw.length > LIMITS[kind]) throw new Error("too_large");
  let body = raw;
  let ext = "mp4";
  let mime = "video/mp4";
  let width: number | undefined, height: number | undefined;
  if (kind === "image") {
    const img = sharp(raw, { failOn: "error" }).rotate().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true });
    body = await img.webp({ quality: 80 }).toBuffer(); // metadata is not copied => EXIF/GPS removed
    const meta = await sharp(body).metadata();
    width = meta.width; height = meta.height; ext = "webp"; mime = "image/webp";
  }
  const name = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  if ((process.env.STORAGE_DRIVER ?? "local") === "supabase") {
    const admin = createAdminClient();
    const { error } = await admin.storage.from("media").upload(name, body, { contentType: mime, upsert: false });
    if (error) throw error;
    return { url: admin.storage.from("media").getPublicUrl(name).data.publicUrl, kind, width, height, bytes: body.length, mime };
  }
  if (process.env.APP_ENV === "production") throw new Error("local storage driver is not allowed in production");
  const dest = path.join(process.cwd(), "public", "uploads", name);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, body);
  return { url: `/uploads/${name}`, kind, width, height, bytes: body.length, mime };
}
