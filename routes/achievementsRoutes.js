const express = require("express");
const router = express.Router();
const achievementsController = require("../controllers/achievementsController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/", requireAuth, achievementsController.getIndex);

module.exports = router;
