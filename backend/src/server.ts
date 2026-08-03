import { createApp } from './app';
import { config } from '@/config/env';
import { initFirebase } from '@/config/firebase';
import { validateEnvironment, validateProductionSecrets } from '@/utils/validateEnv';

try {
  // Validate environment configuration before doing anything else
  // eslint-disable-next-line no-console
  console.log('Validating environment configuration...');
  validateEnvironment();
  validateProductionSecrets();

  initFirebase();

  const app = createApp();

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('🚀 Estate Ease API ready');
    // eslint-disable-next-line no-console
    console.log(`   Port: ${config.port}`);
    // eslint-disable-next-line no-console
    console.log(`   Mode: ${config.mockMode ? 'MOCK' : 'LIVE FIREBASE'}`);
    // eslint-disable-next-line no-console
    console.log(`   Environment: ${config.nodeEnv}`);
    // eslint-disable-next-line no-console
    console.log('');
  });
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', error);
  process.exit(1);
}
