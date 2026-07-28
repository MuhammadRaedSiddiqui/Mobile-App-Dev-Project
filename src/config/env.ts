import Constants from 'expo-constants';

/**
 * Runtime configuration surface. Reads from app.json `extra` (and EXPO_PUBLIC_*
 * env vars when present). Nothing secret lives here — the only Firebase values
 * are the public Web config, and in Phase 0/1 the app runs on mock data.
 */

interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface AppConfig {
  apiBaseUrl: string;
  useMockData: boolean;
  firebase: FirebaseWebConfig;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppConfig> & {
  firebase?: Partial<FirebaseWebConfig>;
};

function env(key: string): string | undefined {
  // EXPO_PUBLIC_* vars are statically inlined by Expo at build time.
  return process.env[key];
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return value === 'true' || value === '1';
}

export const config: AppConfig = {
  apiBaseUrl: env('EXPO_PUBLIC_API_BASE_URL') ?? extra.apiBaseUrl ?? 'http://localhost:4000/v1',
  useMockData: bool(env('EXPO_PUBLIC_USE_MOCK'), extra.useMockData ?? true),
  firebase: {
    apiKey: env('EXPO_PUBLIC_FIREBASE_API_KEY') ?? extra.firebase?.apiKey ?? '',
    authDomain: env('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN') ?? extra.firebase?.authDomain ?? '',
    projectId: env('EXPO_PUBLIC_FIREBASE_PROJECT_ID') ?? extra.firebase?.projectId ?? '',
    storageBucket:
      env('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET') ?? extra.firebase?.storageBucket ?? '',
    messagingSenderId:
      env('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') ?? extra.firebase?.messagingSenderId ?? '',
    appId: env('EXPO_PUBLIC_FIREBASE_APP_ID') ?? extra.firebase?.appId ?? '',
  },
};

/** True once real Firebase Web credentials are present (Phase 2+). */
export const isFirebaseConfigured = Boolean(config.firebase.apiKey && config.firebase.projectId);
