// server/controllers/locationController.js
const db = require('../config/db');

// POST /api/ping
// Called by the laptop agent every few minutes
const receivePing = async (req, res) => {
  const {
    device_id,
    ip_address,
    latitude,
    longitude,
    wifi_name,
    wifi_bssid,
    os_user,
    country,
    city,
    isp
  } = req.body;

  if (!device_id) {
    return res.status(400).json({ error: 'device_id is required.' });
  }

  try {
    // 1. Find the laptop by device_id
    const laptopResult = await db.query(
      'SELECT id, is_reported_stolen FROM laptops WHERE device_id = $1 AND is_active = TRUE',
      [device_id]
    );

    if (laptopResult.rows.length === 0) {
      return res.status(404).json({ error: 'Device not registered in the system.' });
    }

    const laptop = laptopResult.rows[0];

    // 2. Flag as suspicious if laptop is already reported stolen
    const isSuspicious = laptop.is_reported_stolen;

    // 3. Insert location log
    await db.query(
      `INSERT INTO location_logs 
        (laptop_id, ip_address, latitude, longitude, wifi_name, wifi_bssid, os_user, country, city, isp, is_suspicious)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [laptop.id, ip_address, latitude, longitude, wifi_name, wifi_bssid, os_user, country, city, isp, isSuspicious]
    );

    // 4. If stolen, return a lock command to the agent
    if (isSuspicious) {
      console.warn(`🚨 STOLEN LAPTOP PING: device_id=${device_id} from IP=${ip_address}`);
      return res.status(200).json({ status: 'logged', command: 'LOCK' });
    }

    return res.status(200).json({ status: 'logged', command: 'OK' });

  } catch (err) {
    console.error('Ping error:', err.message);
    return res.status(500).json({ error: 'Server error logging location.' });
  }
};

// GET /api/locations/:laptopId
// Get full location history of a laptop (admin or owner)
const getLocationHistory = async (req, res) => {
  const { laptopId } = req.params;
  const { limit = 50 } = req.query;

  try {
    const result = await db.query(
      `SELECT ip_address, latitude, longitude, wifi_name, wifi_bssid, 
              city, country, isp, os_user, is_suspicious, logged_at
       FROM location_logs
       WHERE laptop_id = $1
       ORDER BY logged_at DESC
       LIMIT $2`,
      [laptopId, parseInt(limit)]
    );

    return res.status(200).json({
      laptop_id: laptopId,
      total: result.rows.length,
      logs: result.rows
    });

  } catch (err) {
    console.error('History error:', err.message);
    return res.status(500).json({ error: 'Server error fetching history.' });
  }
};

// GET /api/locations/:laptopId/last
// Get LAST known location (for quick check)
const getLastLocation = async (req, res) => {
  const { laptopId } = req.params;

  try {
    const result = await db.query(
      `SELECT ip_address, latitude, longitude, wifi_name, city, country, os_user, logged_at
       FROM location_logs
       WHERE laptop_id = $1
       ORDER BY logged_at DESC
       LIMIT 1`,
      [laptopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No location data found for this device.' });
    }

    return res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error('Last location error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/locations/:laptopId/evidence
// Generate an evidence report (for university administration)
const generateEvidenceReport = async (req, res) => {
  const { laptopId } = req.params;

  try {
    // Get laptop + student info
    const laptopResult = await db.query(
      `SELECT l.serial_number, l.brand, l.model, l.is_reported_stolen,
              s.full_name, s.student_id, s.email, s.college
       FROM laptops l
       LEFT JOIN students s ON l.assigned_to = s.id
       WHERE l.id = $1`,
      [laptopId]
    );

    if (laptopResult.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop not found.' });
    }

    // Get last 20 location pings
    const logsResult = await db.query(
      `SELECT ip_address, latitude, longitude, wifi_name, city, country, os_user, is_suspicious, logged_at
       FROM location_logs
       WHERE laptop_id = $1
       ORDER BY logged_at DESC
       LIMIT 20`,
      [laptopId]
    );

    // Get theft report if any
    const reportResult = await db.query(
      `SELECT description, last_seen_location, reported_at, status
       FROM theft_reports
       WHERE laptop_id = $1
       ORDER BY reported_at DESC
       LIMIT 1`,
      [laptopId]
    );

    return res.status(200).json({
      generated_at: new Date().toISOString(),
      laptop: laptopResult.rows[0],
      theft_report: reportResult.rows[0] || null,
      location_evidence: logsResult.rows,
      summary: {
        total_pings: logsResult.rows.length,
        suspicious_pings: logsResult.rows.filter(l => l.is_suspicious).length,
        first_seen: logsResult.rows[logsResult.rows.length - 1]?.logged_at || null,
        last_seen: logsResult.rows[0]?.logged_at || null
      }
    });

  } catch (err) {
    console.error('Evidence report error:', err.message);
    return res.status(500).json({ error: 'Server error generating report.' });
  }
};

module.exports = {
  receivePing,
  getLocationHistory,
  getLastLocation,
  generateEvidenceReport
};
