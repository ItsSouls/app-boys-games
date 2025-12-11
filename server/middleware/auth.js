import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export async function auth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    // Fetch fresh role from DB (so promotions take effect without re-login)
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
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Alias used in routers
export const authMiddleware = auth;

// Simple admin guard
export function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
