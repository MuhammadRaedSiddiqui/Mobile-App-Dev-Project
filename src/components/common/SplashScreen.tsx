import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, typography } from '@/theme';

/** Launch splash based on the supplied Estate Ease design. */
export function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(15)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(15)).current;
  const dots = useMemo(() => [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)], []);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 85, useNativeDriver: true }),
    ]).start();
    Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.sequence([Animated.delay(300), Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(300), Animated.timing(titleY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true })]),
      Animated.sequence([Animated.delay(500), Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(500), Animated.timing(subtitleY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true })]),
    ]).start();
    const float = Animated.loop(Animated.sequence([
      Animated.timing(logoFloat, { toValue: -8, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(logoFloat, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    float.start();
    const pulses = dots.map((dot, index) => Animated.loop(Animated.sequence([
      Animated.delay(index * 180),
      Animated.timing(dot, { toValue: 0.45, duration: 450, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 1, duration: 450, useNativeDriver: true }),
    ])));
    pulses.forEach((pulse) => pulse.start());
    return () => { float.stop(); pulses.forEach((pulse) => pulse.stop()); };
  }, [dots, logoFloat, logoOpacity, logoScale, subtitleOpacity, subtitleY, titleOpacity, titleY]);

  return (
    <View style={styles.container} accessibilityLabel="Estate Ease is loading">
      <View style={styles.center}>
        <Animated.View style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }, { translateY: logoFloat }] }]}>
          <Svg width={64} height={64} viewBox="0 0 64 64"><Path d="M8 31 32 11l24 20v22a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V31Zm15 26V39h18v18M22 31h20" fill="none" stroke={colors.primary} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Animated.View>
        <Animated.Text style={[styles.title, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>Estate Ease</Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] }]}>Verified rentals for Karachi.</Animated.Text>
      </View>
      <View style={styles.dots}>{dots.map((dot, index) => <Animated.View key={index} style={[styles.dot, { opacity: dot, transform: [{ scale: dot }] }]} />)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fbf9f8', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', marginBottom: 24 },
  logo: { marginBottom: spacing.sm },
  title: { ...typography.heading, color: '#1b1c1c' },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  dots: { position: 'absolute', bottom: 64, flexDirection: 'row', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
});
