import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin/index.js';
import publicRoutes from './routes/public.js';
import gamesRoutes from './routes/games.js';
import gameStatsRoutes from './routes/gameStats.js';
import billingRoutes from './routes/billing.js';
import videosRoutes from './routes/videos.js';
import pagesRoutes from './routes/pages.js';

export function createApp() {
  const app = express();

  // Behind reverse proxies (Render, Vercel), trust x-forwarded-for for rate limiting and IP-based features
  app.set('trust proxy', 1);

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

  // Stripe webhook necesita el body raw para validar la firma; saltamos JSON/urlencoded en esa ruta
  app.use('/api/billing/webhook', express.raw({ type: '*/*' }));
  const jsonParser = express.json({ limit: BODY_LIMIT });
  const urlencodedParser = express.urlencoded({ limit: BODY_LIMIT, extended: true });
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/billing/webhook')) return next();
    return jsonParser(req, res, next);
  });
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/billing/webhook')) return next();
    return urlencodedParser(req, res, next);
  });

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/games', gamesRoutes);
  app.use('/api/game-stats', gameStatsRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/videos', videosRoutes);
  app.use('/api/pages', pagesRoutes);

  return app;
}
