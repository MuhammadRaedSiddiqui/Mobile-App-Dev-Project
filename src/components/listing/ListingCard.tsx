import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { Listing } from '@/utils/types';
import { formatArea, formatPkr } from '@/utils/format';
import { FreshnessBadge } from './FreshnessBadge';

interface ListingCardProps {
  listing: Listing;
  onPress?: (listing: Listing) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (listing: Listing) => void;
  /** Removed listings surface as visually unavailable rather than disappearing. */
  unavailable?: boolean;
}

/**
 * Photograph-first card: full-bleed image with a freshness pill top-left and a
 * heart toggle top-right, title/meta/price beneath. Mirrors the .app-card and
 * .card patterns in /design/prototype.html.
 */
export function ListingCard({
  listing,
  onPress,
  isFavorite = false,
  onToggleFavorite,
  unavailable = false,
}: ListingCardProps) {
  const cover = listing.imageUrls[0];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress?.(listing)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}

        <FreshnessBadge freshness={listing.freshness} style={styles.badge} />

        {onToggleFavorite ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            hitSlop={8}
            onPress={() => onToggleFavorite(listing)}
            style={styles.heart}
          >
            <Text style={[styles.heartGlyph, isFavorite && styles.heartActive]}>
              {isFavorite ? '♥' : '♡'}
            </Text>
          </Pressable>
        ) : null}

        {unavailable ? (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>No longer available</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {listing.location.area} · {formatArea(listing.area)}
        </Text>
        <Text style={styles.price}>
          <Text style={styles.priceStrong}>{formatPkr(listing.price)}</Text>
          <Text style={styles.priceMuted}>
            {' '}
            · {formatPkr(listing.costBreakdown.estimatedMonthlyTotal)} true monthly
          </Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.xl },
  pressed: { opacity: 0.9 },
  thumb: {
    position: 'relative',
    width: '100%',
    aspectRatio: 20 / 13,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, backgroundColor: colors.surfaceMuted },
  badge: { position: 'absolute', top: spacing.md, left: spacing.md, ...shadows.search },
  heart: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartGlyph: {
    fontSize: 24,
    color: colors.surface,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 3,
  },
  heartActive: { color: colors.primary },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34,34,34,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: { ...typography.bodyStrong, color: colors.white },
  info: { paddingTop: spacing.sm + 2 },
  title: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.body, color: colors.textSecondary, marginTop: 1 },
  price: { marginTop: spacing.xs + 1 },
  priceStrong: { ...typography.bodyStrong, color: colors.textPrimary },
  priceMuted: { ...typography.body, color: colors.textSecondary },
});
