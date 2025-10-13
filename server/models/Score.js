import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  gameId: { type: String, required: true },
  theme: { type: String },
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  percentage: { type: Number, required: true },
  lives: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Index to query scores by user/game/theme ordered by newest first
scoreSchema.index({ userId: 1, gameId: 1, theme: 1, createdAt: -1 });

export const Score = mongoose.model('Score', scoreSchema);
