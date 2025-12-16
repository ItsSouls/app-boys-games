import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    unique: true,
    sparse: true, // Permite múltiples null pero emails únicos cuando existen
    index: true,
    validate: {
      validator: function(v) {
        // Si se proporciona email, debe tener formato válido
        if (!v) return true; // Permite null/undefined
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} no es un email válido`
    }
  },
  username: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  ownerAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
