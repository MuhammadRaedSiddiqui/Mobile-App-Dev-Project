import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '@/config/env';
import { STORAGE_KEYS } from '@/utils/constants';
import { IdentityDocumentType, UserProfile } from '@/utils/types';
import { authService, RegisterInput, setAuthTokenProvider } from '@/services';

interface PersistedSession {
  token: string;
  user: UserProfile;
}

interface AuthState {
  status: 'restoring' | 'unauthenticated' | 'authenticated';
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  status: 'restoring', // start in restoring so the splash decides the first route
  user: null,
  token: null,
  loading: false,
  error: null,
};

async function persistSession(session: PersistedSession | null): Promise<void> {
  if (session) {
    await AsyncStorage.setItem(STORAGE_KEYS.authSession, JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.authSession);
  }
}

/** Restore a persisted session on cold launch so the splash routes correctly. */
export const restoreSession = createAsyncThunk('auth/restore', async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.authSession);
  if (!raw) return null;
  const session = JSON.parse(raw) as PersistedSession;

  // Mock users are seeded in code, so refresh a saved profile when restoring.
  // This prevents a stale AsyncStorage snapshot from overriding seed changes.
  if (config.useMockData) {
    const user = await authService.me(session.user.uid);
    const refreshedSession = { ...session, user };
    await persistSession(refreshedSession);
    return refreshedSession;
  }

  return session;
});

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const result = await authService.login(email, password);
    await persistSession(result);
    return result;
  },
);

export const register = createAsyncThunk('auth/register', async (input: RegisterInput) => {
  const result = await authService.register(input);
  await persistSession(result);
  return result;
});

export const logout = createAsyncThunk('auth/logout', async (_: void, { getState }) => {
  const uid = (getState() as { auth: AuthState }).auth.user?.uid;
  await authService.logout();
  await persistSession(null);
  // Clear user-scoped caches so one user never sees another's cached data.
  if (uid) {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.favorites(uid),
      STORAGE_KEYS.searchHistory(uid),
      STORAGE_KEYS.searchFilters(uid),
      STORAGE_KEYS.notificationPrefs(uid),
      STORAGE_KEYS.lastBrowse(uid),
      STORAGE_KEYS.reported(uid),
    ]);
  }
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (
    patch: Partial<Pick<UserProfile, 'displayName' | 'phone' | 'avatarUrl'>> & {
      avatarUrl?: string | null;
    },
    { getState },
  ) => {
    const state = getState() as { auth: AuthState };
    const uid = state.auth.user?.uid;
    const token = state.auth.token;
    const user = await authService.updateProfile(patch, uid);
    if (token) await persistSession({ token, user });
    return user;
  },
);

export const completeVerification = createAsyncThunk(
  'auth/completeVerification',
  async (documentType: IdentityDocumentType, { getState }) => {
    const state = getState() as { auth: AuthState };
    const user = await authService.completeVerification(documentType, state.auth.user?.uid);
    if (state.auth.token) await persistSession({ token: state.auth.token, user });
    return user;
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setSession(state, action: PayloadAction<PersistedSession>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.status = 'authenticated';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.status = 'authenticated';
        } else {
          state.status = 'unauthenticated';
        }
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = 'unauthenticated';
      });

    const pending = (state: AuthState) => {
      state.loading = true;
      state.error = null;
    };
    const rejected = (state: AuthState, action: { error: { message?: string } }) => {
      state.loading = false;
      state.error = action.error.message ?? 'Something went wrong. Please try again.';
    };
    const authed = (state: AuthState, action: PayloadAction<PersistedSession>) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.status = 'authenticated';
    };

    builder
      .addCase(login.pending, pending)
      .addCase(login.fulfilled, authed)
      .addCase(login.rejected, rejected)
      .addCase(register.pending, pending)
      .addCase(register.fulfilled, authed)
      .addCase(register.rejected, rejected);

    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.status = 'unauthenticated';
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(completeVerification.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { clearError, setSession } = authSlice.actions;
export default authSlice.reducer;

/**
 * Bridge the Axios token provider to the store so every API request carries the
 * current session token. Call once, after the store is created.
 */
export function wireAuthToken(getToken: () => string | null): void {
  setAuthTokenProvider(getToken);
}
