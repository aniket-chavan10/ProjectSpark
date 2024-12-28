const express = require("express");
const router = express.Router();
const { getAllTeams} = require("../controllers/teamController");

router.get("/all-teams", getAllTeams);


module.exports = router;
