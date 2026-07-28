import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '@/components/common';
import { colors, spacing, typography } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { mockPushToken, notificationsService } from '@/services';
import type { NotificationPreferences } from '@/services';

export function NotificationSettingsScreen() {
  const uid = useAppSelector((s) => s.auth.user?.uid ?? '');
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    pushEnabled: false,
    savedSearchAlerts: false,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await notificationsService.getPreferences();
      setPrefs(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (patch: Partial<NotificationPreferences>) => {
    const next = { ...prefs, ...patch };
    setBusy(true);
    try {
      if (patch.pushEnabled === true && !prefs.pushEnabled) {
        await notificationsService.registerPushToken(mockPushToken(uid));
      }
      if (patch.pushEnabled === false && prefs.pushEnabled) {
        await notificationsService.unregisterPushToken();
      }
      const saved = await notificationsService.updatePreferences(next);
      setPrefs(saved);
    } catch {
      Alert.alert('Couldn’t update', 'Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.lead}>
        Alerts are off until you opt in. Saved-search matches are throttled and never block
        listing creation.
      </Text>

      <View style={styles.card}>
        <Row
          label="Push notifications"
          note="Required for any alert"
          value={prefs.pushEnabled}
          disabled={loading || busy}
          onChange={(v) => update({ pushEnabled: v, savedSearchAlerts: v ? prefs.savedSearchAlerts : false })}
        />
        <Row
          label="Saved search alerts"
          note="When a new listing matches a saved search"
          value={prefs.savedSearchAlerts}
          disabled={loading || busy || !prefs.pushEnabled}
          onChange={(v) => update({ savedSearchAlerts: v })}
        />
      </View>

      {!prefs.pushEnabled ? (
        <Text style={styles.hint}>
          Enable push notifications to receive saved-search alerts on this device.
        </Text>
      ) : null}
    </Screen>
  );
}

function Row({
  label,
  note,
  value,
  disabled,
  onChange,
}: {
  label: string;
  note: string;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowNote}>{note}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.lg },
  lead: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  rowText: { flex: 1 },
  rowLabel: { ...typography.ui, color: colors.textPrimary },
  rowNote: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
