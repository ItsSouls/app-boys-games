import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { Video } from '../models/Video.js';
import { User } from '../models/User.js';
import { videoSeed } from '../data/videoSeed.js';

// Load env (.env and .env.local like server)
dotenv.config();
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envLocalPath = path.resolve(__dirname, '../../.env.local');
  dotenv.config({ path: envLocalPath, override: false });
} catch {}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/app_boys_games';
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB || undefined });
  console.log('Connected to Mongo');

  // Try to get owner for createdBy
  const ownerUsername = process.env.SEED_OWNER || 'teacher';
  const owner = await User.findOne({ username: ownerUsername }).lean();
  const ownerId = owner?._id;
  if (!ownerId) {
    throw new Error(
      `Seed owner "${ownerUsername}" not found. Create the user first or set SEED_OWNER to an existing username.`
    );
  }
  console.log('Using createdBy user:', ownerUsername, ownerId.toString());

  let created = 0;
  let updated = 0;
  for (const v of videoSeed) {
    const payload = {
      title: v.title,
      description: v.description || '',
      embedUrl: v.embedUrl,
      emoji: v.emoji || ':)',
    };
    const update = {
      $set: payload,
      $setOnInsert: { createdBy: ownerId },
    };
    const doc = await Video.findOneAndUpdate(
      { embedUrl: v.embedUrl },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (doc) {
      if (doc.createdAt && (Date.now() - new Date(doc.createdAt).getTime()) > 1000) {
        updated += 1;
      } else {
        created += 1;
      }
    }
  }
  console.log(`Seed done. Upserted videos -> created: ${created}, updated: ${updated}`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('Seed failed', e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
