import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from '@/config/env';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { accessLogFormat } from '@/middleware/logging';
import authRoutes from '@/routes/auth.routes';
import listingsRoutes from '@/routes/listings.routes';
import favoritesRoutes from '@/routes/favorites.routes';
import trustRoutes from '@/routes/trust.routes';
import agentRoutes from '@/routes/agent.routes';
import demoRoutes from '@/routes/demo.routes';
import agentsRoutes from '@/routes/agents.routes';
import notificationsRoutes from '@/routes/notifications.routes';
import messagesRoutes from '@/routes/messages.routes';

/** Build the Express app. Exported (without listening) so tests can mount it. */
export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : true }));
  app.use(express.json({ limit: '1mb' }));
  if (config.nodeEnv !== 'test') app.use(morgan(accessLogFormat));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, status: 'ok', mockMode: config.mockMode });
  });

  // Versioned API surface (NFR: /v1 prefix).
  const v1 = express.Router();
  v1.use('/auth', authRoutes);
  v1.use('/listings', listingsRoutes);
  v1.use('/listings', trustRoutes); // /:id/verify, /:id/report
  v1.use('/favorites', favoritesRoutes);
  v1.use('/agent', agentRoutes); // agent-only listing CRUD
  v1.use('/demo', demoRoutes); // mock-only reset helper
  v1.use('/agents', agentsRoutes);
  v1.use('/notifications', notificationsRoutes);
  v1.use('/messages', messagesRoutes);
  app.use('/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
