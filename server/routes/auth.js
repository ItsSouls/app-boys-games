import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { validatePasswordStrength } from '../utils/passwordValidation.js';
import { RefreshToken } from '../models/RefreshToken.js';

const router = express.Router();

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 15 * 60); // 15m
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7); // 7d
const ACCESS_COOKIE = 'abg_at';
const REFRESH_COOKIE = 'abg_rt';
const COOKIE_SAMESITE = IS_PROD ? 'none' : 'lax';

if (!ACCESS_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for auth routes');
}
if (!REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required for auth routes');
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

function signAccessToken(user) {
  // Determine ownerAdmin: admin owns themselves, users have ownerAdmin reference
  const ownerAdmin = user.role === 'admin' ? user._id : user.ownerAdmin;

  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      ownerAdmin: ownerAdmin
    },
    ACCESS_SECRET,
    { expiresIn: `${ACCESS_TOKEN_TTL_SECONDS}s` }
  );
}

function signRefreshToken(user, jti) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const token = jwt.sign({ id: user._id, jti }, REFRESH_SECRET, { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` });
  return { token, expiresAt };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: COOKIE_SAMESITE,
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
    path: '/',
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: COOKIE_SAMESITE,
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

async function persistRefreshToken(userId, token, expiresAt, jti, replacedBy = null) {
  const tokenHash = hashToken(token);
  return RefreshToken.create({
    userId,
    tokenHash,
    jti,
    expiresAt,
    replacedBy,
  });
}

async function revokeRefreshToken(token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date() });
}

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    if (!name || !email || !username || !password) return res.status(400).json({ error: 'Missing fields' });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    const pwdError = validatePasswordStrength(password);
    if (pwdError) return res.status(400).json({ error: pwdError });

    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(409).json({ error: 'Username already used' });
      }
      if (existingUser.email === email) {
        return res.status(409).json({ error: 'Email already used' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, username, passwordHash });
    const accessToken = signAccessToken(user);
    const jti = crypto.randomUUID();
    const { token: refreshToken, expiresAt } = signRefreshToken(user, jti);
    await persistRefreshToken(user._id, refreshToken, expiresAt, jti);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user: { id: user._id, name: user.name, email: user.email, username: user.username, role: user.role } });
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
    const accessToken = signAccessToken(user);
    const jti = crypto.randomUUID();
    const { token: refreshToken, expiresAt } = signRefreshToken(user, jti);
    await persistRefreshToken(user._id, refreshToken, expiresAt, jti);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user: { id: user._id, name: user.name, email: user.email, username: user.username, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/refresh', async (req, res) => {
  const refreshCookie = req.cookies?.[REFRESH_COOKIE];
  if (!refreshCookie) return res.status(401).json({ error: 'No refresh token' });
  try {
    const decoded = jwt.verify(refreshCookie, REFRESH_SECRET);
    const tokenHash = hashToken(refreshCookie);
    const stored = await RefreshToken.findOne({ tokenHash, userId: decoded.id });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const newJti = crypto.randomUUID();
    const { token: newRefreshToken, expiresAt } = signRefreshToken(user, newJti);
    const newAccessToken = signAccessToken(user);
    await RefreshToken.updateOne({ _id: stored._id }, { revokedAt: new Date(), replacedBy: newJti });
    await persistRefreshToken(user._id, newRefreshToken, expiresAt, newJti, null);
    setAuthCookies(res, newAccessToken, newRefreshToken);
    res.json({ ok: true });
  } catch (err) {
    console.warn('[auth/refresh] failed', err?.message || err);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', (req, res) => {
  const refreshCookie = req.cookies?.[REFRESH_COOKIE];
  revokeRefreshToken(refreshCookie).catch((e) => console.warn('[logout] revoke failed', e?.message || e));
  res.clearCookie(ACCESS_COOKIE, { httpOnly: true, secure: IS_PROD, sameSite: COOKIE_SAMESITE, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: IS_PROD, sameSite: COOKIE_SAMESITE, path: '/' });
  res.json({ ok: true });
});

router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
