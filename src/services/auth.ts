/** Authentication service: Firebase Auth + Firestore profiles in live mode. */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { config } from '@/config/env';
import { getDb, getFirebaseAuth, isFirebaseConfigured } from '@/firebase';
import { MOCK_USERS } from '@/mocks/data';
import { UserProfile, UserRole } from '@/utils/types';

export interface AuthResult {
  token: string;
  user: UserProfile;
}
export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  phone?: string;
}
export type ProfilePatch = Partial<Pick<UserProfile, 'displayName' | 'phone' | 'avatarUrl'>> & {
  avatarUrl?: string | null;
};

const mockUsers: Array<UserProfile & { password: string }> = MOCK_USERS.map((user) => ({
  ...user,
}));
let currentMockUid: string | null = null;

function stripPassword(user: UserProfile & { password?: string }): UserProfile {
  const profile = { ...user } as UserProfile & { password?: string };
  delete profile.password;
  return profile;
}
function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
function firebaseUnavailable(): Error {
  return new Error(
    'Firebase is not configured. Add the Firebase web app values to .env and restart Expo.',
  );
}
function friendlyFirebaseError(error: unknown): Error {
  const code = (error as { code?: string }).code;
  if (
    ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(code ?? '')
  )
    return new Error('That email and password do not match. Please try again.');
  if (code === 'auth/email-already-in-use')
    return new Error('An account with this email already exists.');
  if (code === 'auth/invalid-email') return new Error('Enter a valid email address.');
  if (code === 'auth/weak-password')
    return new Error('Choose a password with at least 6 characters.');
  return new Error('We could not complete that request. Please try again.');
}
async function firebaseProfile(uid: string, fallback: UserProfile): Promise<UserProfile> {
  const db = getDb();
  if (!db) return fallback;
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return fallback;
  const data = snapshot.data() as Partial<UserProfile>;
  return {
    ...fallback,
    ...data,
    uid,
    email: data.email ?? fallback.email,
    displayName: data.displayName ?? fallback.displayName,
    role: data.role === 'agent' ? 'agent' : 'seeker',
  };
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    if (config.useMockData) {
      const found = mockUsers.find(
        (user) =>
          user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password,
      );
      if (!found) throw new Error('That email and password do not match. Please try again.');
      currentMockUid = found.uid;
      return delay({ token: `mock-token-${found.uid}`, user: stripPassword(found) });
    }
    if (!isFirebaseConfigured) throw firebaseUnavailable();
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw firebaseUnavailable();
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const fallback: UserProfile = {
        uid: credential.user.uid,
        email: credential.user.email ?? email.trim(),
        displayName: credential.user.displayName ?? email.trim().split('@')[0],
        role: 'seeker',
        isActive: true,
      };
      return {
        token: await credential.user.getIdToken(),
        user: await firebaseProfile(credential.user.uid, fallback),
      };
    } catch (error) {
      throw friendlyFirebaseError(error);
    }
  },

  async register(input: RegisterInput): Promise<AuthResult> {
    if (config.useMockData) {
      if (mockUsers.some((user) => user.email.toLowerCase() === input.email.trim().toLowerCase()))
        throw new Error('An account with this email already exists.');
      const user: UserProfile & { password: string } = {
        uid: `mock-${Date.now()}`,
        email: input.email.trim(),
        displayName: input.displayName.trim(),
        role: input.role,
        phone: input.role === 'agent' ? input.phone : undefined,
        isActive: true,
        password: input.password,
      };
      mockUsers.push(user);
      currentMockUid = user.uid;
      return delay({ token: `mock-token-${user.uid}`, user: stripPassword(user) });
    }
    if (!isFirebaseConfigured) throw firebaseUnavailable();
    try {
      const auth = getFirebaseAuth();
      const db = getDb();
      if (!auth || !db) throw firebaseUnavailable();
      const credential = await createUserWithEmailAndPassword(
        auth,
        input.email.trim(),
        input.password,
      );
      await updateFirebaseProfile(credential.user, { displayName: input.displayName.trim() });
      const user: UserProfile = {
        uid: credential.user.uid,
        email: credential.user.email ?? input.email.trim(),
        displayName: input.displayName.trim(),
        role: input.role,
        phone: input.role === 'agent' ? input.phone : undefined,
        isActive: true,
      };
      await setDoc(doc(db, 'users', user.uid), {
        ...user,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { token: await credential.user.getIdToken(), user };
    } catch (error) {
      throw friendlyFirebaseError(error);
    }
  },

  async logout(): Promise<void> {
    currentMockUid = null;
    if (config.useMockData) return delay(undefined, 150);
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
  },

  async me(): Promise<UserProfile> {
    if (config.useMockData) {
      const found = mockUsers.find((user) => user.uid === currentMockUid) ?? mockUsers[0];
      return delay(stripPassword(found));
    }
    const user = getFirebaseAuth()?.currentUser;
    if (!user) throw new Error('Your session has expired. Please log in again.');
    return firebaseProfile(user.uid, {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Estate Ease user',
      role: 'seeker',
      isActive: true,
    });
  },

  async updateProfile(patch: ProfilePatch, uid?: string): Promise<UserProfile> {
    if (config.useMockData) {
      const found = mockUsers.find((user) => user.uid === (uid ?? currentMockUid));
      if (!found) throw new Error('User not found.');
      if (patch.displayName !== undefined) found.displayName = patch.displayName.trim();
      if (patch.phone !== undefined && found.role === 'agent') found.phone = patch.phone;
      if (patch.avatarUrl !== undefined) found.avatarUrl = patch.avatarUrl || undefined;
      return delay(stripPassword(found));
    }
    const user = getFirebaseAuth()?.currentUser;
    const db = getDb();
    if (!user || !db || (uid && uid !== user.uid))
      throw new Error('Your session has expired. Please log in again.');
    if (patch.displayName !== undefined)
      await updateFirebaseProfile(user, { displayName: patch.displayName });
    await setDoc(
      doc(db, 'users', user.uid),
      { ...patch, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return firebaseProfile(user.uid, {
      uid: user.uid,
      email: user.email ?? '',
      displayName: patch.displayName ?? user.displayName ?? 'Estate Ease user',
      role: 'seeker',
      isActive: true,
    });
  },
};
