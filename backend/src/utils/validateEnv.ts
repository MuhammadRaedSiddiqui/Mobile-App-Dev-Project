/**
 * Environment validation utility. Called once during server startup to validate
 * all required configuration before accepting requests. Fails fast with clear
 * error messages when config is invalid or missing.
 */

import { config } from '@/config/env';

interface ValidationError {
  variable: string;
  issue: string;
  hint?: string;
}

/**
 * Validates all required environment variables and configuration.
 * Throws an error with detailed messages if validation fails.
 */
export function validateEnvironment(): void {
  const errors: ValidationError[] = [];

  // Validate NODE_ENV
  const validEnvs = ['development', 'test', 'production', 'staging'];
  if (!validEnvs.includes(config.nodeEnv)) {
    errors.push({
      variable: 'NODE_ENV',
      issue: `Invalid value: "${config.nodeEnv}"`,
      hint: `Must be one of: ${validEnvs.join(', ')}`,
    });
  }

  // Validate PORT
  if (config.port < 1 || config.port > 65535) {
    errors.push({
      variable: 'PORT',
      issue: `Invalid port: ${config.port}`,
      hint: 'Must be between 1 and 65535',
    });
  }

  // Validate CORS origins
  if (config.corsOrigins.length === 0 && config.nodeEnv !== 'production') {
    errors.push({
      variable: 'CORS_ORIGINS',
      issue: 'No CORS origins configured',
      hint: 'Add at least one origin (e.g., http://localhost:8081)',
    });
  }

  // Validate trust thresholds
  if (config.trust.freshThresholdDays < 1 || config.trust.freshThresholdDays > 365) {
    errors.push({
      variable: 'FRESH_THRESHOLD_DAYS',
      issue: `Invalid value: ${config.trust.freshThresholdDays}`,
      hint: 'Must be between 1 and 365 days',
    });
  }

  if (config.trust.agingThresholdDays <= config.trust.freshThresholdDays) {
    errors.push({
      variable: 'AGING_THRESHOLD_DAYS',
      issue: `Must be greater than FRESH_THRESHOLD_DAYS (${config.trust.freshThresholdDays})`,
      hint: `Current value: ${config.trust.agingThresholdDays}`,
    });
  }

  if (config.trust.unavailableReportThreshold < 1 || config.trust.unavailableReportThreshold > 100) {
    errors.push({
      variable: 'UNAVAILABLE_REPORT_THRESHOLD',
      issue: `Invalid value: ${config.trust.unavailableReportThreshold}`,
      hint: 'Must be between 1 and 100',
    });
  }

  // Validate deposit amortization
  if (config.cost.depositAmortizationMonths < 1 || config.cost.depositAmortizationMonths > 60) {
    errors.push({
      variable: 'DEPOSIT_AMORTIZATION_MONTHS',
      issue: `Invalid value: ${config.cost.depositAmortizationMonths}`,
      hint: 'Must be between 1 and 60 months',
    });
  }

  // Validate Firebase configuration when NOT in mock mode
  if (!config.mockMode) {
    const hasInlineJson = Boolean(config.firebase.serviceAccountJson);
    const hasCredentialsPath = Boolean(config.firebase.credentialsPath);

    if (!hasInlineJson && !hasCredentialsPath) {
      errors.push({
        variable: 'FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS',
        issue: 'Firebase credentials not configured',
        hint: 'When MOCK_MODE=false, you must provide EITHER FIREBASE_SERVICE_ACCOUNT_JSON (inline) OR GOOGLE_APPLICATION_CREDENTIALS (file path)',
      });
    }

    if (!config.firebase.projectId) {
      errors.push({
        variable: 'FIREBASE_PROJECT_ID',
        issue: 'Firebase project ID not configured',
        hint: 'Required when MOCK_MODE=false. Find it in Firebase Console > Project Settings',
      });
    }

    // Validate inline JSON format if provided
    if (hasInlineJson) {
      try {
        const parsed = JSON.parse(config.firebase.serviceAccountJson);
        if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
          errors.push({
            variable: 'FIREBASE_SERVICE_ACCOUNT_JSON',
            issue: 'Invalid service account JSON format',
            hint: 'Must contain project_id, private_key, and client_email',
          });
        }
      } catch (err) {
        errors.push({
          variable: 'FIREBASE_SERVICE_ACCOUNT_JSON',
          issue: 'Invalid JSON format',
          hint: 'Ensure the JSON is properly formatted and on a single line',
        });
      }
    }

    // Warn about production-specific requirements
    if (config.nodeEnv === 'production') {
      if (config.corsOrigins.some((origin) => origin.includes('localhost'))) {
        console.warn(
          '⚠️  WARNING: CORS_ORIGINS includes localhost in production. This may be a security risk.',
        );
      }
    }
  }

  // Throw if any validation errors found
  if (errors.length > 0) {
    const errorMessage = formatValidationErrors(errors);
    throw new Error(errorMessage);
  }

  // Log successful validation
  console.log('✓ Environment validation passed');
  console.log(`  - Mode: ${config.mockMode ? 'MOCK' : 'LIVE FIREBASE'}`);
  console.log(`  - Environment: ${config.nodeEnv}`);
  console.log(`  - Port: ${config.port}`);
  console.log(`  - CORS Origins: ${config.corsOrigins.length} configured`);
}

/**
 * Formats validation errors into a readable error message.
 */
function formatValidationErrors(errors: ValidationError[]): string {
  const lines = [
    '',
    '❌ Environment Validation Failed',
    '',
    'The following configuration issues must be resolved before the server can start:',
    '',
  ];

  errors.forEach((error, index) => {
    lines.push(`${index + 1}. ${error.variable}`);
    lines.push(`   Issue: ${error.issue}`);
    if (error.hint) {
      lines.push(`   Hint: ${error.hint}`);
    }
    lines.push('');
  });

  lines.push('Please check your .env file and ensure all required variables are set correctly.');
  lines.push('See backend/.env.example for a complete reference.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Validates that required secrets are not using example/placeholder values.
 * Call this separately in production to prevent accidentally using demo credentials.
 */
export function validateProductionSecrets(): void {
  if (config.nodeEnv !== 'production') {
    return; // Only validate in production
  }

  const dangerousValues = [
    'example',
    'changeme',
    'placeholder',
    'test',
    'demo',
    'localhost',
    'your-',
  ];

  const secrets = [
    config.firebase.serviceAccountJson,
    config.firebase.credentialsPath,
    config.firebase.projectId,
  ];

  for (const secret of secrets) {
    if (!secret) continue;
    const lowerSecret = secret.toLowerCase();
    for (const dangerous of dangerousValues) {
      if (lowerSecret.includes(dangerous)) {
        throw new Error(
          `❌ Production Security Error: Configuration contains placeholder value "${dangerous}". ` +
            `Never use example/test values in production. Check your .env file.`,
        );
      }
    }
  }
}
