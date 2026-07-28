/**
 * Listing media pipeline.
 *
 * Flow: pick (camera/gallery) → compress toward ≤200 KB WebP → upload via Express
 * (multipart). Mock mode skips transformation and network upload, keeping the
 * original picker URI so photos remain visible without Firebase Storage.
 */
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { config } from '@/config/env';
import { api } from './api';

export const MEDIA_LIMITS = {
  maxImages: 10,
  /** Client compression target (bytes). Server still enforces 5 MB hard cap. */
  targetBytes: 200 * 1024,
  maxEdge: 1600,
} as const;

export interface LocalImage {
  /** Local file URI before upload (or a remote URL already uploaded). */
  uri: string;
  /** Remote URL once uploaded; undefined while pending. */
  remoteUrl?: string;
  uploading?: boolean;
  error?: string;
}

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function ensureLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  const asked = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return asked.granted;
}

async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  const asked = await ImagePicker.requestCameraPermissionsAsync();
  return asked.granted;
}

/**
 * Compress toward WebP ≤ ~200 KB. Falls back to JPEG if WebP save fails on a
 * given platform. Returns the local URI of the compressed file.
 */
export async function compressImage(uri: string): Promise<string> {
  const format = ImageManipulator.SaveFormat.WEBP;
  let width: number = MEDIA_LIMITS.maxEdge;
  let quality = 0.7;
  let current = uri;

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await ImageManipulator.manipulateAsync(current, [{ resize: { width } }], {
        compress: quality,
        format,
      });
      current = result.uri;
      quality = Math.max(0.4, quality - 0.15);
      width = Math.round(width * 0.85);
    }
    return current;
  } catch {
    // Some runtimes lack WebP encode — fall back to JPEG.
    const fallback = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MEDIA_LIMITS.maxEdge } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    return fallback.uri;
  }
}

async function pickAssets(source: 'library' | 'camera', remaining: number): Promise<string[]> {
  if (remaining <= 0) return [];

  if (source === 'camera') {
    const ok = await ensureCameraPermission();
    if (!ok) throw new Error('Camera permission is required to take listing photos.');
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      base64: config.useMockData,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return [];
    return [toMockSafeUri(result.assets[0])];
  }

  const ok = await ensureLibraryPermission();
  if (!ok) throw new Error('Photo library permission is required to add listing photos.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    base64: config.useMockData,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map(toMockSafeUri).slice(0, remaining);
}

/** Expo Go can discard picker cache files after navigation. In mock mode, retain
 * the asset bytes as a data URI so a newly-created listing keeps a usable image. */
function toMockSafeUri(asset: ImagePicker.ImagePickerAsset): string {
  if (config.useMockData && asset.base64) {
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  }
  return asset.uri;
}

async function uploadViaApi(localUri: string): Promise<string> {
  const name = localUri.split('/').pop() ?? 'photo.webp';
  const form = new FormData();
  form.append('images', {
    uri: localUri,
    name: name.endsWith('.webp') ? name : `${name}.webp`,
    type: 'image/webp',
  } as unknown as Blob);

  const { data } = await api.post('/agent/listings/images', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  const urls = data.urls as string[];
  if (!urls?.[0]) throw new Error('Upload returned no URL.');
  return urls[0];
}

export const mediaService = {
  async pickFromLibrary(remainingSlots: number): Promise<string[]> {
    return pickAssets('library', remainingSlots);
  },

  async pickFromCamera(remainingSlots: number): Promise<string[]> {
    return pickAssets('camera', remainingSlots);
  },

  /**
   * Compress then upload one local URI. In mock mode the original local URI is
   * used as the listing image for the current app session.
   */
  async uploadOne(localUri: string, _agentId: string): Promise<string> {
    if (config.useMockData) {
      return delay(localUri);
    }
    const compressed = await compressImage(localUri);
    return uploadViaApi(compressed);
  },

  async uploadMany(localUris: string[], agentId: string): Promise<string[]> {
    const urls: string[] = [];
    for (const uri of localUris) {
      urls.push(await this.uploadOne(uri, agentId));
    }
    return urls;
  },
};
