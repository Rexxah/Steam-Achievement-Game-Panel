const User = require("../models/User");
const Game = require("../models/Game");
const Achievement = require("../models/Achievement");

const achievementsController = {
  async getIndex(req, res) {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy(() => res.redirect("/auth/login"));
        return;
      }

      const games = await Game.findAllByUser(user.id);
      const achievementCounts = await Achievement.getCountsByUser(user.id);
      const legendaryCount = await Achievement.countLegendary(user.id);
      const achievements = await Achievement.findAllByUser(user.id);

      let lastSync = null;
      for (const game of games) {
        if (game.achievements_synced_at) {
          const d = new Date(game.achievements_synced_at);
          if (!lastSync || d > lastSync) lastSync = d;
        }
      }

      const syncStatus = lastSync ? "online" : "offline";
      const syncLabel = lastSync
        ? `Steam zsynchronizowano - ${lastSync.toLocaleDateString("pl-PL")} ${lastSync.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`
        : "Steam niesynchronizowane";

      const unlockedSum = Object.values(achievementCounts).reduce(
        (sum, c) => sum + c.unlocked,
        0,
      );
      const totalSum = Object.values(achievementCounts).reduce(
        (sum, c) => sum + c.total,
        0,
      );
      const percent =
        totalSum > 0 ? Math.round((unlockedSum / totalSum) * 100) : 0;

      res.render("achievements", {
        title: "Osiągnięcia",
        user,
        games,
        achievementCounts,
        syncStatus,
        syncLabel,
        allunlocked: unlockedSum,
        alltotal: totalSum,
        legendaryCount: legendaryCount,
        percent,
        achievements,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("<h1>500 – Błąd serwera</h1>");
    }
  },
};

module.exports = achievementsController;
