/**
 * Auth service. WRITES (register/login/logout/profile) always go through Express
 * in production; Firebase Auth issues the ID token the Axios layer attaches.
 *
 * While `config.useMockData` is true, this resolves against MOCK_USERS so the
 * login → role-aware navigation slice works before real credentials exist.
 */
import { config } from '@/config/env';
import { UserProfile, UserRole } from '@/utils/types';
import { MOCK_USERS } from '@/mocks/data';
import { api } from './api';

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

/** Mutable mock user records so profile edits persist for the session. */
const mockUsers: Array<UserProfile & { password: string }> = MOCK_USERS.map((u) => ({ ...u }));

function stripPassword(u: UserProfile & { password?: string }): UserProfile {
  const profile = { ...u } as UserProfile & { password?: string };
  delete profile.password;
  return profile;
}

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

let currentMockUid: string | null = null;

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    if (config.useMockData) {
      const found = mockUsers.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
      );
      if (!found) {
        throw new Error('That email and password don’t match. Please try again.');
      }
      currentMockUid = found.uid;
      return delay({ token: `mock-token-${found.uid}`, user: stripPassword(found) });
    }
    const { data } = await api.post('/auth/login', { email, password });
    return { token: data.token, user: data.user };
  },

  async register(input: RegisterInput): Promise<AuthResult> {
    if (config.useMockData) {
      const exists = mockUsers.some(
        (u) => u.email.toLowerCase() === input.email.trim().toLowerCase(),
      );
      if (exists) {
        throw new Error('An account with this email already exists.');
      }
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
    const { data } = await api.post('/auth/register', input);
    return { token: data.token, user: data.user };
  },

  async logout(): Promise<void> {
    currentMockUid = null;
    if (config.useMockData) return delay(undefined, 150);
    await api.post('/auth/logout');
  },

  async me(): Promise<UserProfile> {
    if (config.useMockData) {
      const found = mockUsers.find((u) => u.uid === currentMockUid) ?? mockUsers[0];
      return delay(stripPassword(found));
    }
    const { data } = await api.get('/auth/me');
    return data.user;
  },

  async updateProfile(patch: ProfilePatch, uid?: string): Promise<UserProfile> {
    if (config.useMockData) {
      const targetUid = uid ?? currentMockUid;
      const found = mockUsers.find((u) => u.uid === targetUid);
      if (!found) throw new Error('User not found.');
      if (patch.displayName !== undefined) found.displayName = patch.displayName.trim();
      if (patch.phone !== undefined && found.role === 'agent') found.phone = patch.phone;
      if (patch.avatarUrl !== undefined) found.avatarUrl = patch.avatarUrl || undefined;
      return delay(stripPassword(found));
    }
    const { data } = await api.put('/auth/profile', patch);
    return data.user as UserProfile;
  },
};
