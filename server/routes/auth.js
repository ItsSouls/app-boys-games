import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
  const { name, username, password } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'Missing fields' });
  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ error: 'Username already used' });
    const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, username, passwordHash });
  const token = jwt.sign({ id: user._id, username: user.username, name: user.name, role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, name: user.name, username: user.username, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, username: user.username, name: user.name, role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, name: user.name, username: user.username, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
