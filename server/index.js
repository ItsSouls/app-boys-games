import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import scoreRoutes from './routes/scores.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import { Video } from './models/Video.js';
import { Page } from './models/Page.js';
import { Score } from './models/Score.js';
import { GameTheme } from './models/GameTheme.js';

// Load environment variables
dotenv.config(); // loads .env by default if present
// Also try to load root-level .env.local for local dev without exposing to client
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envLocalPath = path.resolve(__dirname, '../.env.local');
  dotenv.config({ path: envLocalPath, override: false });
} catch (e) {
  // no-op if resolution fails
}

const app = express();
const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

async function start() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/app_boys_games';
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB || undefined });
  // Ensure indexes reflect current schema
  try {
    await Score.syncIndexes();
    await Video.syncIndexes();
    await Page.syncIndexes();
    await GameTheme.syncIndexes();
    console.log('Indexes synchronized');
  } catch (e) {
    console.warn('Failed to sync indexes', e?.message || e);
  }

  // Optional: prune duplicates keeping the most recent per (userId,gameId,theme)
  if (process.env.PRUNE_SCORES_ON_START === 'true') {
    try {
      const duplicates = await Score.aggregate([
        { $group: { _id: { userId: '$userId', gameId: '$gameId', theme: '$theme' }, ids: { $push: { _id: '$_id', createdAt: '$createdAt' } }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]);
      for (const d of duplicates) {
        const sorted = d.ids.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const keep = sorted[0]._id;
        const remove = sorted.slice(1).map(x => x._id);
        if (remove.length) {
          await Score.deleteMany({ _id: { $in: remove } });
          console.log(`Pruned ${remove.length} duplicates for`, d._id);
        }
      }
    } catch (e) {
      console.warn('Failed to prune duplicate scores', e?.message || e);
    }
  }
  app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
}

start().catch((e) => {
  console.error('Failed to start server', e);
  process.exit(1);
});
