const express = require('express');
const {
    loginSuperadmin,
    getAllVillageRequests,
    approveVillageRequest,
    rejectVillageRequest
} = require('../controllers/superadminController');
const router = express.Router();

// Route to handle superadmin login
router.post('/login', loginSuperadmin);

// Route to get all village requests (pending and approved)
router.get('/villages', getAllVillageRequests);

// Route to approve a village request (create team and sub-admin)
router.put('/village-request/:id/approve', approveVillageRequest);

// Route to reject a village request
router.post('/villages/:villageId/reject', rejectVillageRequest);

module.exports = router;
