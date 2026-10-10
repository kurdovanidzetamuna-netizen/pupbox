import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, basename } from 'path';

/** The same folder main.ts serves at /uploads (see upload.controller.ts), in its own "dogs" folder. */
const DOG_DIR = join(__dirname, '..', '..', '..', 'public', 'uploads', 'dogs');
export const DOG_PHOTO_MAX_BYTES = 8 * 1024 * 1024;

/**
 * What the file really is, from its first bytes — never from its name or the
 * browser's claim. Only photos: no SVG (it can carry scripts).
 */
function sniff(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/** Saves an uploaded dog photo and returns its public URL. */
export async function saveDogPhoto(buf: Buffer | undefined): Promise<string> {
  if (!buf?.length) throw new BadRequestException('Choose a photo to upload.');
  if (buf.length > DOG_PHOTO_MAX_BYTES) throw new BadRequestException('The photo is too large (8 MB at most).');
  const ext = sniff(buf);
  if (!ext) throw new BadRequestException('Use a JPG, PNG or WebP photo.');
  await mkdir(DOG_DIR, { recursive: true });
  const name = `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;
  await writeFile(join(DOG_DIR, name), buf);
  const base = process.env.API_BASE_URL || 'http://localhost:4000';
  return `${base}/uploads/dogs/${name}`;
}

/** Removes a photo we stored (anything else is left alone). */
export async function removeDogPhoto(url: string | null | undefined) {
  const m = url?.match(/\/uploads\/dogs\/([\w.-]+)$/);
  if (!m) return;
  await unlink(join(DOG_DIR, basename(m[1]))).catch(() => {});
}
