const express = require('express');
const router = express.Router();
const { loginAdmin, getAllAdminsAndTeams,updateTeamLogo} = require('../controllers/adminController');
const verifyAdminToken = require('../middlewares/authMiddleware');
const upload=require('../middlewares/uploadMiddleware')

// Admin login route
router.post('/login', loginAdmin);

// Fetch admin profile, protected route
router.get('/profile', verifyAdminToken, getAllAdminsAndTeams);

router.put('/teams/logo', verifyAdminToken, upload.single('logo'), updateTeamLogo);

module.exports = router;
