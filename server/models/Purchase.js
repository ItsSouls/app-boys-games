import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'active'],
    default: 'pending',
    index: true
  },
  stripeSessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  stripeCustomerId: {
    type: String,
    index: true
  },
  priceId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'usd'
  },
}, { timestamps: true });

export const Purchase = mongoose.model('Purchase', purchaseSchema);
