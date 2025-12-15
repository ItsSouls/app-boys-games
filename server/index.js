import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { Video } from './models/Video.js';
import { Page } from './models/Page.js';
import { Game } from './models/Game.js';
import { GameAttempt } from './models/GameAttempt.js';
import { UserGameStats } from './models/UserGameStats.js';

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

const REQUIRED_ENV_VARS = ['JWT_SECRET'];
const missingEnv = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = createApp();
const PORT = process.env.PORT || 4000;

async function start() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/app_boys_games';
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB || undefined });
  // Ensure indexes reflect current schema
  try {
    await Video.syncIndexes();
    await Page.syncIndexes();
    await Game.syncIndexes();
    await GameAttempt.syncIndexes();
    await UserGameStats.syncIndexes();
    console.log('Indexes synchronized');
  } catch (e) {
    console.warn('Failed to sync indexes', e?.message || e);
  }
  app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
}

start().catch((e) => {
  console.error('Failed to start server', e);
  process.exit(1);
});
