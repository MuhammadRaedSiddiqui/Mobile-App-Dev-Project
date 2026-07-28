import dotenv from 'dotenv';

dotenv.config();

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return value === 'true' || value === '1';
}

/** Centralized, typed server configuration. Nothing reads process.env directly. */
export const config = {
  port: num(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:8081,http://localhost:19006')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  /** When true, the API runs on in-memory fixtures and skips Firebase Admin init. */
  mockMode: bool(process.env.MOCK_MODE, true),

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '',
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '',
  },

  trust: {
    freshThresholdDays: num(process.env.FRESH_THRESHOLD_DAYS, 7),
    agingThresholdDays: num(process.env.AGING_THRESHOLD_DAYS, 14),
    unavailableReportThreshold: num(process.env.UNAVAILABLE_REPORT_THRESHOLD, 3),
  },

  cost: {
    depositAmortizationMonths: num(process.env.DEPOSIT_AMORTIZATION_MONTHS, 12),
  },
} as const;

export type AppConfig = typeof config;
