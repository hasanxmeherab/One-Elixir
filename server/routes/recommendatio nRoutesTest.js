const express = require('express');
const router = express.Router();

console.log('[TestRecommendationRoutes] Module loaded, registering routes...');

// Test route 1
router.get('/test/trending', async (req, res) => {
  res.json({ message: 'Test trending works', data: [] });
});

// Test route 2
router.get('/test/user/:email', async (req, res) => {
  res.json({ message: 'Test user works', email: req.params.email });
});

module.exports = router;
