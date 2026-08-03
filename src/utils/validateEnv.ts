/**
 * Environment validation for the mobile app. Validates configuration on startup
 * to catch issues early before users encounter runtime errors.
 */

import { config, isFirebaseConfigured } from '@/config/env';

interface ValidationWarning {
  variable: string;
  issue: string;
  hint?: string;
}

/**
 * Validates environment configuration for the mobile app.
 * In mock mode, many configs are optional. In live mode, Firebase is required.
 *
 * Returns validation warnings (non-fatal issues to log).
 * Throws an error only for critical misconfigurations.
 */
export function validateEnvironment(): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Validate API base URL
  if (!config.apiBaseUrl) {
    throw new Error(
      'Critical: EXPO_PUBLIC_API_BASE_URL is not configured. ' +
      'The app cannot communicate with the backend. ' +
      'Add it to .env or app.json extra.'
    );
  }

  // Validate URL format
  try {
    new URL(config.apiBaseUrl);
  } catch {
    throw new Error(
      `Critical: EXPO_PUBLIC_API_BASE_URL is not a valid URL: "${config.apiBaseUrl}". ` +
      'It must be a complete URL like http://localhost:4000/v1'
    );
  }

  // Warn if using localhost in production build
  if (!config.useMockData && config.apiBaseUrl.includes('localhost')) {
    warnings.push({
      variable: 'EXPO_PUBLIC_API_BASE_URL',
      issue: 'Using localhost URL in live mode',
      hint: 'This will only work on emulator/simulator. Use your deployed backend URL for device testing.',
    });
  }

  // Validate Firebase configuration when NOT in mock mode
  if (!config.useMockData) {
    if (!isFirebaseConfigured) {
      throw new Error(
        'Critical: Firebase is not configured but EXPO_PUBLIC_USE_MOCK=false. ' +
        'When live mode is enabled, you must provide Firebase Web config. ' +
        'Add the following to .env:\n' +
        '  EXPO_PUBLIC_FIREBASE_API_KEY\n' +
        '  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN\n' +
        '  EXPO_PUBLIC_FIREBASE_PROJECT_ID\n' +
        '  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET\n' +
        '  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID\n' +
        '  EXPO_PUBLIC_FIREBASE_APP_ID\n\n' +
        'Or set EXPO_PUBLIC_USE_MOCK=true to continue using mock data.'
      );
    }

    // Validate individual Firebase fields
    const requiredFirebaseFields: Array<keyof typeof config.firebase> = [
      'apiKey',
      'authDomain',
      'projectId',
      'storageBucket',
      'messagingSenderId',
      'appId',
    ];

    for (const field of requiredFirebaseFields) {
      if (!config.firebase[field]) {
        warnings.push({
          variable: `EXPO_PUBLIC_FIREBASE_${field.replace(/([A-Z])/g, '_$1').toUpperCase()}`,
          issue: 'Firebase configuration incomplete',
          hint: `${field} is missing. Check Firebase Console > Project Settings > General > Your apps`,
        });
      }
    }

    // Validate project ID format
    if (config.firebase.projectId && !/^[a-z0-9-]+$/.test(config.firebase.projectId)) {
      warnings.push({
        variable: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
        issue: 'Invalid Firebase project ID format',
        hint: 'Project IDs contain only lowercase letters, numbers, and hyphens',
      });
    }
  }

  // Check for placeholder values
  const dangerousValues = ['example', 'changeme', 'your-', 'placeholder', 'test-'];
  const configValues = [
    config.apiBaseUrl,
    config.firebase.apiKey,
    config.firebase.projectId,
  ];

  for (const value of configValues) {
    if (!value) continue;
    const lowerValue = value.toLowerCase();
    for (const dangerous of dangerousValues) {
      if (lowerValue.includes(dangerous)) {
        warnings.push({
          variable: 'Configuration',
          issue: `Found placeholder value containing "${dangerous}"`,
          hint: 'Replace example values with your actual configuration',
        });
        break;
      }
    }
  }

  return warnings;
}

/**
 * Logs environment validation results to console.
 * Call this during app initialization (in App.tsx).
 */
export function logEnvironmentValidation(): void {
  try {
    console.log('🔍 Validating environment configuration...');

    const warnings = validateEnvironment();

    // Log success
    console.log('✓ Environment validation passed');
    console.log(`  - Mode: ${config.useMockData ? 'MOCK DATA' : 'LIVE FIREBASE'}`);
    console.log(`  - API: ${config.apiBaseUrl}`);
    console.log(`  - Firebase: ${isFirebaseConfigured ? 'Configured' : 'Not configured (OK in mock mode)'}`);

    // Log warnings if any
    if (warnings.length > 0) {
      console.warn('');
      console.warn('⚠️  Configuration Warnings:');
      warnings.forEach((warning, index) => {
        console.warn(`${index + 1}. ${warning.variable}`);
        console.warn(`   ${warning.issue}`);
        if (warning.hint) {
          console.warn(`   Hint: ${warning.hint}`);
        }
      });
      console.warn('');
    }
  } catch (error) {
    // Fatal configuration error
    console.error('');
    console.error('❌ Environment Validation Failed');
    console.error('');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    console.error('');
    console.error('The app cannot start with invalid configuration.');
    console.error('Please check your .env file and app.json settings.');
    console.error('See .env.example for a complete reference.');
    console.error('');

    // Re-throw to prevent app from starting with bad config
    throw error;
  }
}

/**
 * Returns a user-friendly description of the current environment.
 * Useful for support/debugging.
 */
export function getEnvironmentInfo(): string {
  return [
    `Mode: ${config.useMockData ? 'Mock Data' : 'Live Firebase'}`,
    `API: ${config.apiBaseUrl}`,
    `Firebase: ${isFirebaseConfigured ? 'Configured' : 'Not configured'}`,
  ].join('\n');
}
