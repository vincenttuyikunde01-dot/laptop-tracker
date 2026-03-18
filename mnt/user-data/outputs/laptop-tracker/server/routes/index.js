// server/routes/index.js
const express = require('express');
const router = express.Router();

const { authenticate, adminOnly } = require('../middleware/auth');
const { registerStudent, loginStudent, loginAdmin } = require('../controllers/authController');
const { registerLaptop, reportStolen, getMyLaptop, getAllLaptops, getStolenLaptops } = require('../controllers/laptopController');
const { receivePing, getLocationHistory, getLastLocation, generateEvidenceReport } = require('../controllers/locationController');

// ================================
// AUTH ROUTES
// ================================
router.post('/auth/register', registerStudent);           // Student registers account
router.post('/auth/login', loginStudent);                 // Student logs in
router.post('/auth/admin/login', loginAdmin);             // Admin logs in

// ================================
// LAPTOP ROUTES
// ================================
router.get('/laptops/my', authenticate, getMyLaptop);                          // Student: see my laptop
router.post('/laptops/report-stolen', authenticate, reportStolen);             // Student: report stolen
router.post('/laptops/register', authenticate, adminOnly, registerLaptop);     // Admin: register new laptop
router.get('/laptops', authenticate, adminOnly, getAllLaptops);                // Admin: all laptops
router.get('/laptops/stolen', authenticate, adminOnly, getStolenLaptops);      // Admin: stolen laptops only

// ================================
// LOCATION / TRACKING ROUTES
// ================================
router.post('/ping', receivePing);                                                                          // Laptop agent: send location ping
router.get('/locations/:laptopId', authenticate, getLocationHistory);                                      // Get full location history
router.get('/locations/:laptopId/last', authenticate, getLastLocation);                                    // Get last known location
router.get('/locations/:laptopId/evidence', authenticate, adminOnly, generateEvidenceReport);              // Generate evidence report

// ================================
// HEALTH CHECK
// ================================
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'UR Laptop Tracker API' });
});

module.exports = router;
