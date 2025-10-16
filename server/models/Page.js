import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    url: { type: String, trim: true },
  },
  { _id: false },
);

const pageSchema = new mongoose.Schema(
  {
    section: { type: String, enum: ['vocabulario', 'gramatica'], required: true, index: true },
    topic: { type: String, required: true, index: true, trim: true },
    summary: { type: String, default: '', trim: true },
    coverImage: { type: String, default: '', trim: true },
    content: { type: String, default: '' },
    resources: { type: [resourceSchema], default: [] },
    isPublished: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

pageSchema.index({ section: 1, topic: 1 }, { unique: true });
pageSchema.index({ section: 1, order: 1 });

export const Page = mongoose.model('Page', pageSchema);
