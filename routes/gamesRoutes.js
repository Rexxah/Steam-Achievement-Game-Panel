const express = require("express");
const router = express.Router();
const gamesController = require("../controllers/gamesController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/", requireAuth, gamesController.getIndex);
router.get("/sync", requireAuth, gamesController.syncGamesSSE);
router.post("/sync", requireAuth, gamesController.syncGames);
router.get("/:id", requireAuth, gamesController.getGame);
router.post("/:id/status", requireAuth, gamesController.updateStatus);

module.exports = router;
