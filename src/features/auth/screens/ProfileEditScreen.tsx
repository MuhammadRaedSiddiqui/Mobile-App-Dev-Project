/**
 * Profile edit — display name, agent phone, and optional avatar.
 * Avatar uses the same media pipeline as listing photos (mock CDN URL in mock mode).
 */
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, Screen } from '@/components/common';
import { colors, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile } from '@/store/slices/authSlice';
import { mediaService } from '@/services/media';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ProfileEdit'>;

export function ProfileEditScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const loading = useAppSelector((s) => s.auth.loading);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [uploading, setUploading] = useState(false);

  const pickAvatar = () => {
    Alert.alert('Profile photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          try {
            setUploading(true);
            const uris = await mediaService.pickFromCamera(1);
            if (!uris[0] || !user?.uid) return;
            const url = await mediaService.uploadOne(uris[0], `avatars/${user.uid}`);
            setAvatarUrl(url);
          } catch (e) {
            Alert.alert('Couldn’t update photo', e instanceof Error ? e.message : 'Try again.');
          } finally {
            setUploading(false);
          }
        },
      },
      {
        text: 'Photo library',
        onPress: async () => {
          try {
            setUploading(true);
            const uris = await mediaService.pickFromLibrary(1);
            if (!uris[0] || !user?.uid) return;
            const url = await mediaService.uploadOne(uris[0], `avatars/${user.uid}`);
            setAvatarUrl(url);
          } catch (e) {
            Alert.alert('Couldn’t update photo', e instanceof Error ? e.message : 'Try again.');
          } finally {
            setUploading(false);
          }
        },
      },
      {
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => setAvatarUrl(''),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onSave = async () => {
    const name = displayName.trim();
    if (name.length < 2) {
      Alert.alert('Check your name', 'Display name must be at least 2 characters.');
      return;
    }
    try {
      await dispatch(
        updateProfile({
          displayName: name,
          phone: user?.role === 'agent' ? phone.trim() : undefined,
          avatarUrl: avatarUrl || '',
        }),
      ).unwrap();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Couldn’t save', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Text style={styles.heading}>Edit profile</Text>

          <Pressable style={styles.avatarWrap} onPress={pickAvatar} disabled={uploading}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{nameInitial(displayName || user?.displayName)}</Text>
              </View>
            )}
            <Text style={styles.changePhoto}>{uploading ? 'Uploading…' : 'Change photo'}</Text>
          </Pressable>

          <Input
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
          {user?.role === 'agent' ? (
            <Input
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="0300-1234567"
            />
          ) : null}

          <Button label="Save" onPress={onSave} loading={loading || uploading} fullWidth style={styles.save} />
          <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} fullWidth />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function nameInitial(name?: string) {
  return name?.charAt(0)?.toUpperCase() ?? '?';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  heading: { ...typography.heading, color: colors.textPrimary },
  avatarWrap: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surfaceMuted },
  avatarText: { ...typography.heading, color: colors.textInverse },
  changePhoto: { ...typography.caption, fontWeight: '600', color: colors.primary },
  save: { marginTop: spacing.md },
});
