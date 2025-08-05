const express = require("express");
const router = express.Router();
const inningsController = require("../controllers/inningsController");

router.post("/switch-innings", inningsController.switchInnings);

module.exports = router;
