import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin/index.js';
import publicRoutes from './routes/public.js';
import gamesRoutes from './routes/games.js';
import gameStatsRoutes from './routes/gameStats.js';

export function createApp() {
  const app = express();

  const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const BODY_LIMIT = process.env.JSON_BODY_LIMIT || '2mb';

  const cspDirectives = {
    defaultSrc: ["'self'"],
    baseUri: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
  };

  app.use(
    helmet({
      contentSecurityPolicy: { directives: cspDirectives },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
    })
  );
  app.use(cors({ origin: ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/games', gamesRoutes);
  app.use('/api/game-stats', gameStatsRoutes);

  return app;
}
