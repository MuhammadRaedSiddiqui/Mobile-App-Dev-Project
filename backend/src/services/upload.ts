/**
 * Listing image upload validation + storage.
 *
 * MIME is sniffed from magic bytes (never trusted from the client Content-Type).
 * Allowed: jpeg / png / webp. Max 5 MB per file, max 10 files per request.
 * Mock mode returns deterministic CDN-style URLs without touching Firebase Storage.
 */
import { randomUUID } from 'crypto';
import { config } from '@/config/env';
import { Errors } from '@/utils/errors';

export const IMAGE_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxFiles: 10,
  allowed: ['jpeg', 'png', 'webp'] as const,
} as const;

export type ImageExt = (typeof IMAGE_LIMITS.allowed)[number];

export interface UploadedImage {
  buffer: Buffer;
  originalName: string;
  /** Extension derived from magic bytes. */
  ext: ImageExt;
  /** Sniffed MIME, e.g. image/jpeg. */
  mime: string;
}

/** Detect image type from file header bytes. Returns null if unsupported. */
export function detectImageType(buffer: Buffer): { ext: ImageExt; mime: string } | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpeg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // WEBP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  return null;
}

/** Validate raw buffers into UploadedImage records or throw a 422 AppError. */
export function validateImageBuffers(
  files: Array<{ buffer: Buffer; originalname?: string }>,
): UploadedImage[] {
  if (!files.length) throw Errors.validation('At least one image is required.');
  if (files.length > IMAGE_LIMITS.maxFiles) {
    throw Errors.validation(`No more than ${IMAGE_LIMITS.maxFiles} images can be uploaded at once.`);
  }

  return files.map((file, index) => {
    if (!file.buffer?.length) {
      throw Errors.validation(`Image ${index + 1} is empty.`);
    }
    if (file.buffer.length > IMAGE_LIMITS.maxBytes) {
      throw Errors.validation(
        `Image ${index + 1} exceeds the ${IMAGE_LIMITS.maxBytes / (1024 * 1024)} MB limit.`,
      );
    }
    const detected = detectImageType(file.buffer);
    if (!detected) {
      throw Errors.validation(
        `Image ${index + 1} must be a JPEG, PNG, or WebP file (content type is checked server-side).`,
      );
    }
    return {
      buffer: file.buffer,
      originalName: file.originalname ?? `image-${index + 1}`,
      ext: detected.ext,
      mime: detected.mime,
    };
  });
}

/**
 * Persist validated images and return public URLs.
 * Mock: synthetic CDN URLs (no Storage). Live: Firebase Storage under listings/{agentId}/.
 */
export async function storeListingImages(
  agentId: string,
  images: UploadedImage[],
): Promise<string[]> {
  if (config.mockMode) {
    const stamp = Date.now();
    return images.map(
      (img, i) =>
        `https://cdn.estateease.local/listings/${agentId}/${stamp}-${i}-${randomUUID().slice(0, 8)}.${img.ext}`,
    );
  }

  // Live path: Admin SDK Storage. Lazy-require so mock tests never need credentials.
  const { getStorage } = await import('firebase-admin/storage');
  const bucket = getStorage().bucket();
  const urls: string[] = [];

  for (const img of images) {
    const objectPath = `listings/${agentId}/${randomUUID()}.${img.ext}`;
    const file = bucket.file(objectPath);
    await file.save(img.buffer, {
      metadata: { contentType: img.mime, cacheControl: 'public,max-age=31536000' },
      resumable: false,
      public: true,
    });
    urls.push(`https://storage.googleapis.com/${bucket.name}/${objectPath}`);
  }

  return urls;
}
