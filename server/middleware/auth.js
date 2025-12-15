import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const ACCESS_COOKIE = 'abg_at';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for auth middleware');
}

function extractToken(req) {
  const hdr = req.headers.authorization || '';
  const bearer = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  return bearer || cookieToken || null;
}

async function attachUser(decoded, req) {
  try {
    const u = await User.findById(decoded.id).lean();
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      username: decoded.username,
      name: decoded.name,
      role: u?.role || decoded.role || 'user',
    };
  } catch {
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      username: decoded.username,
      name: decoded.name,
      role: decoded.role || 'user',
    };
  }
}

export async function auth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await attachUser(decoded, req);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Alias used in routers
export const authMiddleware = auth;

// Optional auth: if token present, attach req.user; otherwise continue
export async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await attachUser(decoded, req);
  } catch {
    // ignore invalid token on optional auth
  }
  next();
}

// Simple admin guard
export function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
