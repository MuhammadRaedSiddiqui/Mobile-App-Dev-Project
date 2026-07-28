import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Screen } from '@/components/common';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import type { MainStackParamList } from '@/navigation/types';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.displayName?.charAt(0) ?? '?'}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{user?.displayName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.role === 'agent' && user.phone ? (
            <Text style={styles.email}>{user.phone}</Text>
          ) : null}
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>{user?.role === 'agent' ? 'Agent' : 'Renter'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.row} onPress={() => navigation.navigate('ProfileEdit')}>
          <Text style={styles.rowLabel}>Edit profile</Text>
          <Text style={styles.rowAction}>›</Text>
        </Pressable>
        {user?.role === 'seeker' ? (
          <>
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('NotificationSettings')}
            >
              <Text style={styles.rowLabel}>Notifications</Text>
              <Text style={styles.rowAction}>›</Text>
            </Pressable>
            <Pressable style={styles.row} onPress={() => navigation.navigate('SavedSearches')}>
              <Text style={styles.rowLabel}>Saved searches</Text>
              <Text style={styles.rowAction}>›</Text>
            </Pressable>
          </>
        ) : (
          <Row label="Notifications" note="Seeker feature" />
        )}
        <Row label="Help & support" note="Later" />
      </View>

      <Button
        label="Log out"
        variant="ghost"
        onPress={confirmLogout}
        fullWidth
        style={styles.logout}
      />
    </Screen>
  );
}

function Row({ label, note }: { label: string; note: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowPhase}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  avatarText: { ...typography.headingSm, color: colors.textInverse },
  info: { flex: 1, gap: 2 },
  name: { ...typography.subheading, color: colors.textPrimary },
  email: { ...typography.body, color: colors.textSecondary },
  roleTag: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.canvas,
  },
  roleTagText: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  section: { marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowLabel: { ...typography.ui, color: colors.textPrimary },
  rowPhase: { ...typography.caption, color: colors.textDisabled },
  rowAction: { ...typography.headingSm, color: colors.textSecondary },
  logout: { marginTop: spacing.xxl },
});
