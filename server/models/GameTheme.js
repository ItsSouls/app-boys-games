import mongoose from 'mongoose';

const wordSchema = new mongoose.Schema(
  {
    spanish: { type: String, required: true },
    english: { type: String, required: true },
    emoji: { type: String },
    color: { type: String },
    number: { type: Number },
  },
  { _id: false }
);

const gameThemeSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    gameType: { type: String, enum: ['bubbles', 'multichoice'], required: true, index: true },
    words: { type: [wordSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

gameThemeSchema.index({ gameType: 1, slug: 1 }, { unique: true });
gameThemeSchema.index({ isActive: 1, updatedAt: -1 });

export const GameTheme = mongoose.model('GameTheme', gameThemeSchema);
