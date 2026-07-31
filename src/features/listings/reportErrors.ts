/**
 * Shared by the detail screen and the report screen, so a failed report reads
 * the same wherever it surfaces.
 */
import { ApiRequestError } from '@/services';

/**
 * Turn a failed report into advice the seeker can act on. "Try again in a
 * moment" is wrong for a rate limit (the window is an hour) and for a 403,
 * where retrying can never succeed.
 */
export function reportErrorMessage(err: unknown): { title: string; body: string } {
  if (err instanceof ApiRequestError) {
    if (err.status === 429 || err.code === 'RATE_LIMITED') {
      return {
        title: 'Too many reports',
        body: err.message || 'You’ve reported several listings recently. Try again later.',
      };
    }
    if (err.status === 403) {
      return { title: 'Can’t report this listing', body: err.message };
    }
    if (err.status === 404) {
      return { title: 'Listing unavailable', body: 'This listing is no longer available.' };
    }
  }
  return { title: 'Couldn’t report', body: 'Please try again in a moment.' };
}
