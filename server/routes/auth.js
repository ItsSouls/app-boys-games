import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { auth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { validatePasswordStrength } from '../utils/passwordValidation.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for auth routes');
}

const AUTH_RATE_WINDOW_MS = Number(process.env.AUTH_RATE_WINDOW_MS || 15 * 60 * 1000); // 15 min default
const AUTH_RATE_MAX = Number(process.env.AUTH_RATE_MAX || 10); // 10 attempts per window

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_WINDOW_MS,
  max: AUTH_RATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
  handler: (req, res, next, options) => {
    console.warn(`Rate limit exceeded for ${req.ip} on ${req.originalUrl}`);
    res.status(options.statusCode).json(options.message);
  },
});

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) return res.status(400).json({ error: 'Missing fields' });
    const pwdError = validatePasswordStrength(password);
    if (pwdError) return res.status(400).json({ error: pwdError });
    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ error: 'Username already used' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, username, passwordHash });
    const token = jwt.sign(
      { id: user._id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res
      .cookie('abg_token', token, COOKIE_OPTS)
      .json({ user: { id: user._id, name: user.name, username: user.username, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user._id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res
      .cookie('abg_token', token, COOKIE_OPTS)
      .json({ user: { id: user._id, name: user.name, username: user.username, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('abg_token', { ...COOKIE_OPTS, maxAge: 0 });
  res.json({ ok: true });
});

router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
