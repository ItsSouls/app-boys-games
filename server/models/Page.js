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
    category: { type: String, default: 'Bloque 1', trim: true, index: true },
    summary: { type: String, default: '', trim: true },
    coverImage: { type: String, default: '', trim: true },
    content: { type: String, default: '' },
    resources: { type: [resourceSchema], default: [] },
    isPublished: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },

    // Multi-tenant: cada admin gestiona su propio contenido
    ownerAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },

    // Contenido público: solo para usuarios no autenticados
    // Público siempre tiene ownerAdmin=null
    isPublic: {
      type: Boolean,
      default: false,
      index: true
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

pageSchema.index({ section: 1, topic: 1 }, { unique: true });
pageSchema.index({ section: 1, order: 1 });
pageSchema.index({ ownerAdmin: 1, section: 1 });
pageSchema.index({ isPublic: 1, ownerAdmin: 1 });

export const Page = mongoose.model('Page', pageSchema);
