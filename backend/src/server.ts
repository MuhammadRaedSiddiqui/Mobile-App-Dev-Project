import { createApp } from './app';
import { config } from '@/config/env';
import { initFirebase } from '@/config/firebase';

initFirebase();

const app = createApp();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[estate-ease-api] listening on http://localhost:${config.port} (mockMode=${config.mockMode})`,
  );
});
