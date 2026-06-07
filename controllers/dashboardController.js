const User = require("../models/User");
const Game = require("../models/Game");
const Achievement = require("../models/Achievement");

const dashboardController = {
  async getIndex(req, res) {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy(() => res.redirect("/auth/login"));
        return;
      }
      const games = await Game.findAllByUser(user.id);
      const achievementCounts = await Achievement.getCountsByUser(user.id);
      const recentUnlocked = await Achievement.getRecentUnlocked(user.id, 6);
      const legendaryCount = await Achievement.countLegendary(user.id);

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

      const totalHours = Math.round(
        games.reduce((sum, g) => sum + (g.playtime_forever || 0), 0) / 60,
      );
      const countByStatus = {
        tracking: games.filter((g) => g.status === "tracking").length,
        completed: games.filter((g) => g.status === "completed").length,
        dropped: games.filter((g) => g.status === "dropped").length,
        not_played: games.filter((g) => g.status === "not_played").length,
      };

      const unlockedSum = Object.values(achievementCounts).reduce(
        (sum, c) => sum + c.unlocked,
        0,
      );
      const totalSum = Object.values(achievementCounts).reduce(
        (sum, c) => sum + c.total,
        0,
      );
      const achPercent =
        totalSum > 0 ? Math.round((unlockedSum / totalSum) * 100) : 0;

      const topGames = [...games]
        .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
        .slice(0, 5);

      res.render("dashboard", {
        title: "Panel główny",
        user,
        games,
        syncStatus,
        syncLabel,
        totalHours,
        countByStatus,
        achievementCounts,
        unlockedSum,
        totalSum,
        achPercent,
        legendaryCount,
        recentUnlocked,
        topGames,
        lastSync,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("<h1>500 – Błąd serwera</h1>");
    }
  },
};

module.exports = dashboardController;
