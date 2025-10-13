import express from 'express';
import { Score } from '../models/Score.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
  const { gameId, theme, score, maxScore, percentage, lives, createdAt, type: reqType } = req.body;
  const type = reqType || gameId; // 'bubbles' | 'multichoice' | other game ids
    const keyTheme = theme || gameId;

    // Keep only 1 attempt per (user,gameId,theme): atomic upsert to avoid race conditions
    const doc = await Score.findOneAndUpdate(
      { userId: req.user.id, gameId, theme: keyTheme },
      {
        $set: {
          type,
          gameId,
          theme: keyTheme,
          score,
          maxScore,
          percentage,
          lives,
          createdAt: createdAt ? new Date(createdAt) : new Date(),
        },
        $setOnInsert: { userId: req.user.id },
      },
      { upsert: true, new: true }
    );

    // Defensive: if legacy duplicates exist, remove all except the one we just upserted
    await Score.deleteMany({ userId: req.user.id, gameId, theme: keyTheme, _id: { $ne: doc._id } });

  // No LastScore model: mantenemos un único Score por (userId,gameId,theme)

    res.json({ ok: true, id: doc._id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const list = await Score.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(100);
    res.json({ scores: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get last score per type(gameId)+theme usando Score
router.get('/last', auth, async (req, res) => {
  try {
    const { type, theme } = req.query;
    if (!type || !theme) return res.status(400).json({ error: 'Missing type or theme' });
  const doc = await Score.findOne({ userId: req.user.id, gameId: type, theme });
    res.json({ last: doc || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// List last scores for user (all themes/types) usando Score
router.get('/last/all', auth, async (req, res) => {
  try {
  const list = await Score.find({ userId: req.user.id }).sort({ updatedAt: -1 }).limit(200);
    res.json({ lastScores: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Monthly leaderboard for rankings (top players in current month)
router.get('/rankings/monthly', auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const { gameId, theme, limit } = req.query || {};
    const match = { createdAt: { $gte: startOfMonth } };
    if (gameId) match.gameId = gameId;
    if (theme) match.theme = theme;

    const maxItems = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const leaderboard = await Score.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          bestPercentage: { $max: '$percentage' },
          bestScore: { $max: '$score' },
          attempts: { $sum: 1 },
          lastGame: { $last: '$gameId' },
          lastTheme: { $last: '$theme' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          username: '$user.username',
          bestPercentage: 1,
          bestScore: 1,
          attempts: 1,
          lastGame: 1,
          lastTheme: 1,
        },
      },
      { $sort: { bestPercentage: -1, bestScore: -1, attempts: 1 } },
      { $limit: maxItems },
    ]);

    res.json({ from: startOfMonth.toISOString(), rankings: leaderboard });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
