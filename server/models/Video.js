import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  embedUrl: { type: String, required: true },
  emoji: { type: String, default: '🎬' },
  category: { type: String, default: 'General', trim: true, index: true },
  order: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

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
}, { timestamps: true });

export const Video = mongoose.model('Video', videoSchema);
