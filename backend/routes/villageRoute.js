const express = require('express');
const router = express.Router();
const { addVillage, verifyOTP, getAllVillagesFromDB } = require('../controllers/villageController'); // Ensure this path is correct

// Define routes
router.post('/add', addVillage);        // Correct handler for addVillage
router.post('/verify', verifyOTP);      // Correct handler for verifyOTP
router.get('/all', getAllVillagesFromDB);  // Correct handler for getAllVillagesFromDB

module.exports = router;
