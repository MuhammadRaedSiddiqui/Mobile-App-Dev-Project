import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii } from '@/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/** Pulsing placeholder block. Used instead of spinners for list loading states. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = radii.input,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius: radius, opacity }, style]}
    />
  );
}

/** Full listing-card skeleton matching the card layout. */
export function ListingCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={180} radius={radii.card} />
      <View style={{ height: 10 }} />
      <Skeleton width="70%" height={14} />
      <View style={{ height: 6 }} />
      <Skeleton width="50%" height={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surfaceMuted },
  card: { marginBottom: 20 },
});
