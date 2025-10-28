import { User } from '../../models/User.js';

export function createPromoteRoute(router) {
  router.post('/promote', async (req, res) => {
    const headerSecret = req.headers['x-admin-secret'];
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      return res.status(501).json({ error: 'ADMIN_SECRET not configured' });
    }
    if (headerSecret !== adminSecret) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { username, role } = req.body || {};
    if (!username || !role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Missing or invalid fields' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { username },
      { $set: { role } },
      { new: true },
    );
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      ok: true,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        role: updatedUser.role,
        name: updatedUser.name,
      },
    });
  });
}
