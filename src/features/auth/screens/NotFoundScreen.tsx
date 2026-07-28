import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@/components/common';
import { colors, spacing, typography } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'NotFound'>;

/** Deep-link / unknown-route fallback. */
export function NotFoundScreen({ navigation }: Props) {
  const role = useAppSelector((s) => s.auth.user?.role);

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.body}>
          That link doesn’t match a listing or screen in Estate Ease. Check the URL or go back
          home.
        </Text>
        <Button
          label="Go home"
          fullWidth
          onPress={() =>
            navigation.navigate(role === 'agent' ? 'AgentTabs' : 'SeekerTabs', undefined as never)
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: spacing.lg, paddingTop: spacing.huge },
  title: { ...typography.heading, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
});
