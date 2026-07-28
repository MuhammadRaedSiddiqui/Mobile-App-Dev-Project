import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, Screen } from '@/components/common';
import { colors, spacing, typography } from '@/theme';
import { notificationsService } from '@/services';
import type { SavedSearch } from '@/services';
import type { MainStackParamList } from '@/navigation/types';

export function SavedSearchesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await notificationsService.listSavedSearches());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = (id: string) => {
    Alert.alert('Remove saved search?', 'You will stop receiving alerts for this search.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await notificationsService.deleteSavedSearch(id);
          load();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Saved searches</Text>
      <Text style={styles.lead}>
        Searches saved from the Search tab. Turn on alerts in Notification settings.
      </Text>

      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : items.length === 0 ? (
        <EmptyState
          title="No saved searches yet"
          message="Use “Save this search” on the Search screen after applying filters."
          actionLabel="Go to Search"
          onAction={() => navigation.navigate('SeekerTabs', { screen: 'Search' })}
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.meta}>
                  {item.notifyOnNewListings ? 'Alerts on' : 'Alerts off'} ·{' '}
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Pressable onPress={() => remove(item.id)} hitSlop={8}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.lg },
  lead: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  loading: { ...typography.body, color: colors.textSecondary },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  rowBody: { flex: 1, gap: 4 },
  label: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  remove: { ...typography.caption, color: colors.stale, fontWeight: '600' },
});
