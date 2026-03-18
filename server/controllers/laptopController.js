// server/controllers/laptopController.js
const db = require('../config/db');

// POST /api/laptops/register - Admin registers a new laptop
const registerLaptop = async (req, res) => {
  const { device_id, serial_number, brand, model, assigned_to_student_id } = req.body;

  if (!device_id || !serial_number) {
    return res.status(400).json({ error: 'device_id and serial_number are required.' });
  }

  try {
    // Find the student by student_id string
    let studentUUID = null;
    if (assigned_to_student_id) {
      const studentResult = await db.query(
        'SELECT id FROM students WHERE student_id = $1',
        [assigned_to_student_id]
      );
      if (studentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Student not found.' });
      }
      studentUUID = studentResult.rows[0].id;
    }

    const result = await db.query(
      `INSERT INTO laptops (device_id, serial_number, brand, model, assigned_to)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, device_id, serial_number, brand, model`,
      [device_id, serial_number, brand, model, studentUUID]
    );

    return res.status(201).json({
      message: 'Laptop registered successfully.',
      laptop: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A laptop with this device_id or serial_number already exists.' });
    }
    console.error('Register laptop error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
};

// POST /api/laptops/report-stolen - Student reports their laptop stolen
const reportStolen = async (req, res) => {
  const { device_id, description, last_seen_location } = req.body;
  const studentId = req.user.id; // from JWT

  if (!device_id) {
    return res.status(400).json({ error: 'device_id is required.' });
  }

  try {
    // Find the laptop assigned to this student
    const laptopResult = await db.query(
      'SELECT id FROM laptops WHERE device_id = $1 AND assigned_to = $2',
      [device_id, studentId]
    );

    if (laptopResult.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop not found or not assigned to you.' });
    }

    const laptopId = laptopResult.rows[0].id;

    // Mark laptop as stolen
    await db.query(
      'UPDATE laptops SET is_reported_stolen = TRUE, reported_stolen_at = NOW() WHERE id = $1',
      [laptopId]
    );

    // Create theft report
    await db.query(
      `INSERT INTO theft_reports (laptop_id, student_id, description, last_seen_location)
       VALUES ($1, $2, $3, $4)`,
      [laptopId, studentId, description, last_seen_location]
    );

    return res.status(200).json({
      message: '🚨 Laptop reported as stolen. Tracking activated. Any future ping will be flagged.',
      laptop_id: laptopId
    });

  } catch (err) {
    console.error('Report stolen error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/laptops/my - Student sees their own laptop info
const getMyLaptop = async (req, res) => {
  const studentId = req.user.id;

  try {
    const result = await db.query(
      `SELECT l.id, l.device_id, l.serial_number, l.brand, l.model, 
              l.is_reported_stolen, l.registered_at,
              ll.ip_address, ll.city, ll.country, ll.logged_at AS last_seen
       FROM laptops l
       LEFT JOIN LATERAL (
         SELECT ip_address, city, country, logged_at
         FROM location_logs
         WHERE laptop_id = l.id
         ORDER BY logged_at DESC LIMIT 1
       ) ll ON TRUE
       WHERE l.assigned_to = $1 AND l.is_active = TRUE`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No laptop assigned to your account yet.' });
    }

    return res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error('Get my laptop error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/laptops - Admin: list all laptops
const getAllLaptops = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM latest_laptop_locations ORDER BY last_seen DESC NULLS LAST`
    );

    return res.status(200).json({ total: result.rows.length, laptops: result.rows });

  } catch (err) {
    console.error('Get all laptops error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/laptops/stolen - Admin: list stolen laptops only
const getStolenLaptops = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM latest_laptop_locations WHERE is_reported_stolen = TRUE ORDER BY last_seen DESC NULLS LAST`
    );

    return res.status(200).json({ total: result.rows.length, stolen_laptops: result.rows });

  } catch (err) {
    console.error('Get stolen laptops error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  registerLaptop,
  reportStolen,
  getMyLaptop,
  getAllLaptops,
  getStolenLaptops
};
