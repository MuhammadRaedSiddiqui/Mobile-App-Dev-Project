/**
 * Tests for environment validation utility
 */

import { validateEnvironment, getEnvironmentInfo } from '../validateEnv';
import { config } from '@/config/env';

// Mock the config module
jest.mock('@/config/env', () => ({
  config: {
    apiBaseUrl: 'http://localhost:4000/v1',
    useMockData: true,
    firebase: {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
    },
  },
  isFirebaseConfigured: false,
}));

describe('validateEnvironment', () => {
  it('should pass validation in mock mode with valid config', () => {
    const warnings = validateEnvironment();
    expect(Array.isArray(warnings)).toBe(true);
  });

  it('should throw error if API base URL is missing', () => {
    const originalUrl = config.apiBaseUrl;
    (config as any).apiBaseUrl = '';

    expect(() => validateEnvironment()).toThrow('EXPO_PUBLIC_API_BASE_URL is not configured');

    (config as any).apiBaseUrl = originalUrl;
  });

  it('should throw error if API base URL is invalid', () => {
    const originalUrl = config.apiBaseUrl;
    (config as any).apiBaseUrl = 'not-a-valid-url';

    expect(() => validateEnvironment()).toThrow('not a valid URL');

    (config as any).apiBaseUrl = originalUrl;
  });

  it('should warn about localhost in live mode', () => {
    const originalMock = config.useMockData;
    const originalConfigured = require('@/config/env').isFirebaseConfigured;

    (config as any).useMockData = false;
    require('@/config/env').isFirebaseConfigured = true;

    // Should not throw but should return warnings
    expect(() => {
      const warnings = validateEnvironment();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.issue.includes('localhost'))).toBe(true);
    }).not.toThrow();

    (config as any).useMockData = originalMock;
    require('@/config/env').isFirebaseConfigured = originalConfigured;
  });

  it('should throw error when Firebase not configured in live mode', () => {
    const originalMock = config.useMockData;
    (config as any).useMockData = false;

    expect(() => validateEnvironment()).toThrow('Firebase is not configured');

    (config as any).useMockData = originalMock;
  });
});

describe('getEnvironmentInfo', () => {
  it('should return formatted environment info', () => {
    const info = getEnvironmentInfo();
    expect(info).toContain('Mode:');
    expect(info).toContain('API:');
    expect(info).toContain('Firebase:');
  });

  it('should indicate mock mode correctly', () => {
    const info = getEnvironmentInfo();
    expect(info).toContain('Mock Data');
  });
});
