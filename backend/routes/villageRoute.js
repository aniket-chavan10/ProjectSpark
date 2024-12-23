// routes/villageRoute.js

const express = require('express');
const router = express.Router();
const { registerVillage } = require('../controllers/villageController'); // Import the controller function

// Route to register a new village
router.post('/register', registerVillage);

module.exports = router;
