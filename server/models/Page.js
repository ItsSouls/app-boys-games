import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema({
  section: { type: String, enum: ['vocabulario', 'gramatica'], required: true, index: true },
  topic: { type: String, required: true, index: true },
  content: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

pageSchema.index({ section: 1, topic: 1 }, { unique: true });

export const Page = mongoose.model('Page', pageSchema);
