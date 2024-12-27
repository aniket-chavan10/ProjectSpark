const express = require("express");
const router = express.Router();
const { registerMasterAdmin, loginMasterAdmin,getAllVillages,updateVillageStatus } = require("../controllers/masteradminController");
const verifyMasterAdminToken = require('../middlewares/masterAdminAuth')
// Route to register a new master admin
router.post("/register", registerMasterAdmin);

// Route to authenticate master admin (login)
router.post("/login", loginMasterAdmin);

// Route to approve or reject a village request (with village id in path)
router.get("/villages", verifyMasterAdminToken,getAllVillages);

router.put("/villages/update/:id",verifyMasterAdminToken, updateVillageStatus);


module.exports = router;
