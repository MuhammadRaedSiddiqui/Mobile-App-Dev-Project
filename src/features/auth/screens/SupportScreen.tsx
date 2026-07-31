import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radii, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Support'>;

const options = [
  'Change my search or filters',
  'Update my profile details',
  'Contact an agent',
  'An agent isn’t responding',
  'I need help with something else',
];

/** Guided support conversation inspired by the supplied reference screen. */
export function SupportScreen({ navigation }: Props) {
  const onOption = (option: string) => {
    if (option === 'I need help with something else') {
      navigation.navigate('MessageThread', {
        threadId: 'support-estate-ease',
        listingId: 'support',
        agentId: 'support',
        listingTitle: 'Estate Ease Support',
        agentName: 'Estate Ease Support',
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>E</Text></View>
        <Text style={styles.title}>Estate Ease Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.chat}>
        <View style={styles.previousThread}>
          <View style={styles.previousOption}><Text style={styles.previousText}>I want to report a safety or listing issue</Text></View>
          <View style={styles.previousOption}><Text style={styles.previousText}>I’d rather type out my issue</Text></View>
        </View>
        <View style={styles.userTime}><Text style={styles.time}>Now</Text></View>
        <View style={styles.userBubble}><Text style={styles.userText}>I need help with a listing</Text></View>

        <View style={styles.agentLine}><Avatar /><Text style={styles.agentName}>Estate Ease Support</Text><Text style={styles.time}>Now</Text></View>
        <View style={styles.agentBubble}><Text style={styles.agentText}>Okay, it seems like you need help with a listing. Do any of these look right?</Text></View>

        <View style={styles.optionCard}>
          {options.map((option, index) => (
            <Pressable key={option} onPress={() => onOption(option)} style={[styles.option, index !== options.length - 1 && styles.optionBorder]}>
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Avatar() {
  return <View style={styles.avatar}><Text style={styles.avatarText}>E</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { height: 128, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, position: 'relative' },
  back: { position: 'absolute', left: spacing.lg, top: 43, padding: spacing.sm },
  backText: { fontSize: 42, lineHeight: 34, color: colors.textPrimary },
  brandMark: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#444' },
  brandMarkText: { fontSize: 25, color: colors.textInverse, fontWeight: '700', fontStyle: 'italic' },
  title: { ...typography.ui, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.sm },
  chat: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  previousThread: { marginLeft: 40, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, overflow: 'hidden', opacity: 0.18, marginTop: -1 },
  previousOption: { minHeight: 66, justifyContent: 'center', paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  previousText: { ...typography.ui, color: colors.textPrimary },
  userTime: { alignItems: 'flex-end', marginTop: spacing.xl },
  time: { ...typography.caption, color: colors.textSecondary },
  userBubble: { alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: '#414141', borderRadius: radii.card, borderTopRightRadius: 4, padding: spacing.lg, marginTop: spacing.xs },
  userText: { ...typography.ui, color: colors.textInverse },
  agentLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xl },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.caption, color: colors.textInverse, fontWeight: '700' },
  agentName: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  agentBubble: { alignSelf: 'flex-start', width: '82%', backgroundColor: '#f7f7f7', borderRadius: radii.card, borderTopLeftRadius: 4, padding: spacing.lg, marginTop: spacing.sm, marginLeft: 40 },
  agentText: { ...typography.ui, color: colors.textPrimary, lineHeight: 25 },
  optionCard: { alignSelf: 'flex-start', width: '82%', marginTop: spacing.lg, marginLeft: 40, borderWidth: 1, borderColor: '#d8d8d8', borderRadius: radii.card, overflow: 'hidden' },
  option: { paddingHorizontal: spacing.lg, paddingVertical: 24, backgroundColor: colors.surface },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { ...typography.ui, color: colors.textPrimary, lineHeight: 24 },
});
