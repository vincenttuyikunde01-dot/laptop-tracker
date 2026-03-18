const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ message: "API working ✅" });
});

module.exports = router;