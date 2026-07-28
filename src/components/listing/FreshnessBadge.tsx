import { ViewStyle } from 'react-native';
import { Badge } from '@/components/common';
import { Freshness } from '@/utils/types';
import { freshnessLabel } from '@/utils/format';

interface FreshnessBadgeProps {
  freshness: Freshness;
  style?: ViewStyle;
}

/**
 * Maps a server-derived freshness status to the restrained pill tones from the
 * prototype: fresh = neutral, aging = muted grey, stale = coral "needs verifying".
 */
export function FreshnessBadge({ freshness, style }: FreshnessBadgeProps) {
  const tone =
    freshness.status === 'fresh' ? 'neutral' : freshness.status === 'aging' ? 'muted' : 'alert';
  return (
    <Badge
      dot
      tone={tone}
      label={freshnessLabel(freshness.status, freshness.daysSince)}
      style={style}
    />
  );
}
