import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ErrorState } from '@/components/common';
import { colors, radii, spacing, typography } from '@/theme';
import { messagesService } from '@/services';
import type { MessageThreadSummary } from '@/services';
import type { MainStackParamList } from '@/navigation/types';

type Filter = 'all' | 'unread' | 'new';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'new', label: 'New' },
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [threads, setThreads] = useState<MessageThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    messagesService
      .listThreads()
      .then(setThreads)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState onRetry={load} />
      </SafeAreaView>
    );
  }

  const filteredThreads = threads.filter((t) => {
    if (filter === 'unread') return t.unreadCount > 0;
    if (filter === 'new') {
      return Date.now() - new Date(t.lastMessageAt).getTime() < ONE_DAY_MS;
    }
    return true;
  });

  if (!loading && threads.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyBody}>
            When you message an agent about a listing, your conversations will appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.heading}>Messages</Text>
      <View style={styles.pillRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.pill, filter === f.key && styles.pillActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => item.threadId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate('MessageThread', {
                threadId: item.threadId,
                listingId: item.listingId,
                agentId: item.otherPartyUid,
                listingTitle: item.listingTitle,
                agentName: item.otherPartyName,
              })
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.otherPartyName.charAt(0)}</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.otherPartyName}
              </Text>
              <Text style={styles.rowListing} numberOfLines={1}>
                {item.listingTitle}
              </Text>
              <Text style={styles.rowPreview} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>
            {item.unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  heading: {
    ...typography.headingSm,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  pillActive: {
    backgroundColor: colors.textPrimary,
  },
  pillText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.textInverse,
  },
  list: { paddingVertical: spacing.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { ...typography.headingSm, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.bodyStrong, color: colors.textInverse },
  rowBody: { flex: 1, gap: 2 },
  rowName: { ...typography.bodyStrong, color: colors.textPrimary },
  rowListing: { ...typography.caption, color: colors.textSecondary },
  rowPreview: { ...typography.caption, color: colors.textSecondary },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { ...typography.caption, color: colors.white, fontWeight: '700' },
});
