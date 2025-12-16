import express from 'express';
import Stripe from 'stripe';
import { auth } from '../middleware/auth.js';
import { Purchase } from '../models/Purchase.js';
import { User } from '../models/User.js';

const router = express.Router();

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripePriceId = process.env.STRIPE_PRICE_ID;
const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(stripeSecretKey);

// POST /api/billing/checkout - Create Checkout Session (requires auth)
router.post('/checkout', auth, async (req, res) => {
  try {
    if (!stripePriceId) {
      return res.status(500).json({ error: 'STRIPE_PRICE_ID not configured' });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has an active purchase
    const existingPurchase = await Purchase.findOne({ userId, status: 'active' });
    if (existingPurchase) {
      return res.status(400).json({ error: 'User already has an active license' });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${frontendBaseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBaseUrl}/purchase/cancel`,
      customer_email: user.email,
      metadata: {
        userId: userId.toString(),
      },
    });

    // Create pending purchase record
    await Purchase.create({
      userId,
      status: 'pending',
      stripeSessionId: session.id,
      stripeCustomerId: session.customer || '',
      priceId: stripePriceId,
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/billing/webhook - Handle Stripe webhooks (raw body required)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!stripeWebhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event;
  const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
  if (!rawBody) {
    console.error('Webhook raw body missing or parsed; ensure express.raw is applied before this route');
    return res.status(400).send('Webhook Error: raw body required');
  }

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      // Find the purchase by session ID
      const purchase = await Purchase.findOne({ stripeSessionId: session.id });

      if (!purchase) {
        console.error('Purchase not found for session:', session.id);
        return res.status(404).send('Purchase not found');
      }

      // Update purchase status
      purchase.status = 'active';
      purchase.stripeCustomerId = session.customer || purchase.stripeCustomerId;
      purchase.amount = session.amount_total || purchase.amount;
      await purchase.save();

      // Update user role to admin
      await User.findByIdAndUpdate(purchase.userId, { role: 'admin' });

      console.log('Purchase activated and user promoted to admin:', purchase.userId);
    } catch (error) {
      console.error('Error processing checkout.session.completed:', error);
      return res.status(500).send('Error processing webhook');
    }
  }

  res.json({ received: true });
});

export default router;
