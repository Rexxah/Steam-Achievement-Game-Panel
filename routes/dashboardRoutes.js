const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/", requireAuth, dashboardController.getIndex);

module.exports = router;
