import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppSelector } from '@/store/hooks';
import { messagesService } from '@/services';
import type { Message } from '@/services';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'MessageThread'>;

export function MessageThreadScreen({ route, navigation }: Props) {
  const { threadId, listingId, agentId, listingTitle, agentName } = route.params;
  const user = useAppSelector((s) => s.auth.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const isVerified = user?.verificationStatus === 'verified';

  const load = useCallback(() => {
    if (threadId) {
      messagesService
        .getThread(threadId)
        .then(setMessages)
        .catch(() => undefined);
      messagesService.markRead(threadId).catch(() => undefined);
    }
  }, [threadId]);

  useEffect(load, [load]);

  useEffect(() => {
    if (listingTitle) {
      navigation.setOptions({ title: listingTitle });
    }
  }, [listingTitle, navigation]);

  const handleSend = async () => {
    if (!isVerified) {
      Alert.alert('Verify your identity', 'Complete identity verification before sending messages.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Verify now', onPress: () => navigation.navigate('IdentityVerification') },
      ]);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const msg = await messagesService.sendMessage({
        listingId,
        text: trimmed,
        seekerUid: user?.role === 'agent' ? agentId : undefined,
        threadId,
        senderUid: user?.uid,
        listingTitle,
        agentName,
      });
      setMessages((prev) => [...prev, msg]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Couldn\'t send', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const isMe = (msg: Message) => msg.fromUid === user?.uid || msg.fromUid === '__self__';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              Start a conversation about this listing.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <View style={[styles.bubble, isMe(item) ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, isMe(item) && styles.bubbleTextMine]}>
                  {item.text}
                </Text>
                <Text style={[styles.time, isMe(item) && styles.timeMine]}>
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={2000}
            editable={!sending && isVerified}
          />
          <Pressable
            style={[styles.sendBtn, (isVerified && (!text.trim() || sending)) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={isVerified && (!text.trim() || sending)}
          >
            <Text style={styles.sendText}>{isVerified ? 'Send' : 'Verify'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  list: { padding: spacing.md, gap: spacing.sm },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
  },
  bubbleText: { ...typography.body, color: colors.textPrimary },
  bubbleTextMine: { color: colors.white },
  time: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { ...typography.bodyStrong, color: colors.white },
});
