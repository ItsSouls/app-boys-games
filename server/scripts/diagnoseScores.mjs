import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/app_boys_games';

async function main() {
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB || undefined });
  const db = mongoose.connection.db;
  const coll = db.collection('scores');
  console.log('--- INDEXES (scores) ---');
  const idx = await coll.indexes();
  console.log(idx);

  console.log('\n--- DUPLICATES by (userId, gameId, theme) ---');
  const dups = await coll.aggregate([
    { $group: {
        _id: { userId: '$userId', gameId: '$gameId', theme: '$theme' },
        ids: { $push: { _id: '$_id', createdAt: '$createdAt', score: '$score' } },
        count: { $sum: 1 }
    }},
    { $match: { count: { $gt: 1 } } },
    { $sort: { 'ids.0.createdAt': -1 } }
  ]).toArray();

  if (!dups.length) {
    console.log('No duplicates found.');
  } else {
    console.log(JSON.stringify(dups, null, 2));
    // Show sample docs for the first duplicate key
    const first = dups[0];
    const { userId, gameId, theme } = first._id;
    console.log(`\n--- SAMPLE docs for userId=${userId}, gameId=${gameId}, theme=${theme} ---`);
    const docs = await coll.find({ 'userId': userId, gameId, theme }).sort({ createdAt: -1 }).toArray();
    console.log(JSON.stringify(docs, null, 2));
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
