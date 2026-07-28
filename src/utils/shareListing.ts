import { Share, Platform } from 'react-native';

/** Deep link + web-friendly share payload for a listing. */
export function listingShareUrl(listingId: string): string {
  return `estateease://listing/${listingId}`;
}

export async function shareListing(input: {
  listingId: string;
  title: string;
  area: string;
  priceLabel: string;
}): Promise<boolean> {
  const url = listingShareUrl(input.listingId);
  const message = `${input.title}\n${input.area} · ${input.priceLabel}\n\n${url}`;

  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { message, url }
        : { message, title: input.title },
    );
    return result.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}
