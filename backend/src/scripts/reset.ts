/**
 * CLI entry for demo reset (mock in-memory store of a running process is separate —
 * prefer POST /v1/demo/reset against the live server, or import resetDemoState in tests).
 *
 * This script documents the contract and exits 0 after printing instructions when
 * invoked standalone; the authoritative reset for a running API is the HTTP endpoint.
 */
import { config } from '@/config/env';
import { resetDemoState } from '@/services/store';

function main() {
  if (!config.mockMode) {
    // eslint-disable-next-line no-console
    console.error('Refusing to reset: MOCK_MODE must be true for the in-memory reset script.');
    process.exit(1);
  }

  const result = resetDemoState();
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        message:
          'In-process store reset. If the API server is already running, call POST /v1/demo/reset instead so its memory is cleared.',
        ...result,
      },
      null,
      2,
    ),
  );
}

main();
