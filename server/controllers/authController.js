// server/controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/register  - Student self-registration
const registerStudent = async (req, res) => {
  const { student_id, full_name, email, phone, college, password } = req.body;

  if (!student_id || !full_name || !email || !college || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Check if student already exists
    const existing = await db.query(
      'SELECT id FROM students WHERE email = $1 OR student_id = $2',
      [email, student_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Student with this email or ID already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO students (student_id, full_name, email, phone, college, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, student_id, full_name, email, college`,
      [student_id, full_name, email, phone, college, password_hash]
    );

    const student = result.rows[0];
    const token = jwt.sign(
      { id: student.id, role: 'student', student_id: student.student_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ message: 'Registration successful.', token, student });

  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
};

// POST /api/auth/login - Student login
const loginStudent = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM students WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const student = result.rows[0];
    const isValid = await bcrypt.compare(password, student.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: student.id, role: 'student', student_id: student.student_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      student: {
        id: student.id,
        full_name: student.full_name,
        student_id: student.student_id,
        email: student.email,
        college: student.college
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Server error during login.' });
  }
};

// POST /api/auth/admin/login - Admin login
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const admin = result.rows[0];
    const isValid = await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Admin login successful.',
      token,
      admin: { id: admin.id, full_name: admin.full_name, role: admin.role }
    });

  } catch (err) {
    console.error('Admin login error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { registerStudent, loginStudent, loginAdmin };
