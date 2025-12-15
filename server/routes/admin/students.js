import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { auth } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';

const router = express.Router();
const MAX_STUDENTS_PER_ADMIN = 30;

// GET /api/admin/students - List students of the admin
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;

    const students = await User.find(
      { ownerAdmin: adminId },
      { passwordHash: 0 } // Exclude password hash
    ).sort({ createdAt: -1 });

    res.json({
      students,
      count: students.length,
      limit: MAX_STUDENTS_PER_ADMIN,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST /api/admin/students - Create a new student account
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { name, username, password } = req.body;

    // Validate required fields
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required' });
    }

    // Validate username format (basic validation)
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check student limit
    const studentCount = await User.countDocuments({ ownerAdmin: adminId });
    if (studentCount >= MAX_STUDENTS_PER_ADMIN) {
      return res.status(400).json({
        error: `Maximum number of students reached (${MAX_STUDENTS_PER_ADMIN})`,
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create student
    const student = await User.create({
      name,
      username,
      passwordHash,
      role: 'user',
      ownerAdmin: adminId,
    });

    res.status(201).json({
      student: {
        _id: student._id,
        name: student.name,
        username: student.username,
        role: student.role,
        ownerAdmin: student.ownerAdmin,
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// DELETE /api/admin/students/:id - Delete a student account
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const studentId = req.params.id;

    // Find student and verify ownership
    const student = await User.findOne({
      _id: studentId,
      ownerAdmin: adminId,
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found or not owned by this admin' });
    }

    // Delete student
    await User.deleteOne({ _id: studentId });

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

export default router;
