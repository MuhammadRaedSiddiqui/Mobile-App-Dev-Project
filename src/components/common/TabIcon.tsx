import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type IconName = 'home' | 'search' | 'map' | 'heart' | 'heart-filled' | 'person' | 'home-work' | 'mail';

interface TabIconProps {
  name: IconName;
  color: string;
  size?: number;
  focused?: boolean;
}

const paths: Record<IconName, { d: string; viewBox?: string; filled?: string }> = {
  home: {
    d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    viewBox: '0 0 24 24',
  },
  search: {
    d: 'M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',
    viewBox: '0 0 24 24',
  },
  map: {
    d: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    viewBox: '0 0 24 24',
  },
  heart: {
    d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    viewBox: '0 0 24 24',
  },
  'heart-filled': {
    d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    viewBox: '0 0 24 24',
    filled: 'fill',
  },
  person: {
    d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    viewBox: '0 0 24 24',
  },
  'home-work': {
    d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m4-8h.01M12 13h.01M9 17h.01M12 17h.01M15 13h.01M15 17h.01M9 9h.01M12 9h.01M15 9h.01',
    viewBox: '0 0 24 24',
  },
  mail: {
    d: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    viewBox: '0 0 24 24',
  },
};

export function TabIcon({ name, color, size = 24, focused }: TabIconProps) {
  const icon = paths[name];
  const isFilled = name === 'heart-filled' || (name === 'heart' && focused);

  return (
    <View style={styles.container}>
      <Svg
        width={size}
        height={size}
        viewBox={icon.viewBox || '0 0 24 24'}
        fill={isFilled ? color : 'none'}
        stroke={color}
        strokeWidth={isFilled ? 0 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d={icon.d} fill={isFilled ? color : 'none'} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
