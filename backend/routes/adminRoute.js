const express = require('express');
const router = express.Router();
const { loginAdmin } = require('../controllers/adminController'); 
const verifyAdminToken =require('../middlewares/authMiddleware')

// Admin login route
router.post('/login', loginAdmin);

router.get('/dashboard', verifyAdminToken, (req, res) => {
  res.status(200).json({ message: 'This is a protected admin route' });
});

module.exports = router;
