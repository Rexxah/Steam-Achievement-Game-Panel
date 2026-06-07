const User = require("../models/User");
const Game = require("../models/Game");
const Achievement = require("../models/Achievement");
const getOwnedGames = require("../services/steam/getOwnedGames");
const getSchemaForGame = require("../services/steam/getSchemaForGame");
const getPlayerAchievements = require("../services/steam/getPlayerAchievements");
const getGlobalAchievementPercentages = require("../services/steam/getGlobalAchievementPercentages");

const gamesController = {
  async syncGames(req, res) {
    try {
      const user = await User.findById(req.session.userId);

      if (!user || !user.steam_id) {
        return res.status(400).json({
          error: "Brak powiązanego konta Steam. Dodaj Steam URL w profilu.",
        });
      }

      const steamGames = await getOwnedGames(user.steam_id);

      let added = 0;
      let updated = 0;

      // Etap 0: synchronizacja listy gier
      for (const game of steamGames) {
        const has_achievements = game.has_community_visible_stats ? 1 : 0;
        const header_img_url = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg`;
        const playtime_forever = game.playtime_forever || 0;
        const playtime_2_weeks = game.playtime_2weeks || 0;
        const derivedStatus =
          playtime_forever === 0 ? "not_played" : "tracking";

        const existing = await Game.findByUserAndAppId(
          req.session.userId,
          String(game.appid),
        );

        if (existing) {
          await Game.updateFromSync(existing.id, {
            playtime_forever,
            playtime_2_weeks,
            has_achievements,
            currentStatus: existing.status,
            derivedStatus,
          });
          updated++;
        } else {
          await Game.create({
            user_id: req.session.userId,
            steam_app_id: String(game.appid),
            title: game.name,
            header_img_url,
            playtime_forever,
            playtime_2_weeks,
            has_achievements,
            status: derivedStatus,
          });
          added++;
        }
      }

      // Etapy 1-3: synchronizacja osiągnięć dla gier, które je posiadają
      const allUserGames = await Game.findAllByUser(req.session.userId);
      const gamesWithAchievements = allUserGames.filter(
        (g) => g.has_achievements,
      );

      for (const game of gamesWithAchievements) {
        try {
          // Etap 1: schemat osiągnięć (nazwy, opisy, ikony)
          const schema = await getSchemaForGame(game.steam_app_id);
          for (const ach of schema) {
            await Achievement.upsert({
              game_id: game.id,
              api_name: ach.api_name,
              display_name: ach.display_name,
              description: ach.description,
              icon_url: ach.icon_url,
              icon_url_gray: ach.icon_url_gray,
              is_unlocked: 0,
              unlock_time: null,
              global_percent: null,
            });
          }

          // Etap 2: stan osiągnięć gracza (odblokowane, czas odblokowania)
          const playerAchs = await getPlayerAchievements(
            user.steam_id,
            game.steam_app_id,
          );
          if (playerAchs) {
            for (const ach of playerAchs) {
              await Achievement.upsert({
                game_id: game.id,
                api_name: ach.api_name,
                display_name: null,
                description: null,
                icon_url: null,
                icon_url_gray: null,
                is_unlocked: ach.is_unlocked,
                unlock_time: ach.unlock_time,
                global_percent: null,
              });
            }
            // Oznacz datę synchronizacji osiągnięć
            await Game.updateSyncTime(game.id);
          }

          // Etap 3: globalny procent graczy, którzy zdobyli każde osiągnięcie
          const globalMap = await getGlobalAchievementPercentages(
            game.steam_app_id,
          );
          for (const [api_name, percent] of globalMap) {
            await Achievement.upsert({
              game_id: game.id,
              api_name,
              display_name: null,
              description: null,
              icon_url: null,
              icon_url_gray: null,
              is_unlocked: 0,
              unlock_time: null,
              global_percent: percent,
            });
          }
        } catch (achErr) {
          // Błąd osiągnięć jednej gry nie przerywa całego synca
          console.error(
            `Błąd synchronizacji osiągnięć dla gry ${game.title} (${game.steam_app_id}):`,
            achErr.message,
          );
        }
      }

      res.json({ success: true, added, updated, total: steamGames.length });
    } catch (err) {
      console.error("Błąd synchronizacji gier:", err.message);
      res.status(500).json({ error: "Błąd synchronizacji gier." });
    }
  },

  async syncGamesSSE(req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const user = await User.findById(req.session.userId);
      if (!user || !user.steam_id) {
        send("error", { message: "Brak powiązanego konta Steam." });
        res.end();
        return;
      }

      send("status", { message: "Pobieranie listy gier ze Steam..." });
      const steamGames = await getOwnedGames(user.steam_id);

      let added = 0;
      let updated = 0;

      send("status", { message: `Przetwarzanie ${steamGames.length} gier...` });

      for (const game of steamGames) {
        const has_achievements = game.has_community_visible_stats ? 1 : 0;
        const header_img_url = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg`;
        const playtime_forever = game.playtime_forever || 0;
        const playtime_2_weeks = game.playtime_2weeks || 0;
        const derivedStatus =
          playtime_forever === 0 ? "not_played" : "tracking";

        const existing = await Game.findByUserAndAppId(
          req.session.userId,
          String(game.appid),
        );

        if (existing) {
          await Game.updateFromSync(existing.id, {
            playtime_forever,
            playtime_2_weeks,
            has_achievements,
            currentStatus: existing.status,
            derivedStatus,
          });
          updated++;
        } else {
          await Game.create({
            user_id: req.session.userId,
            steam_app_id: String(game.appid),
            title: game.name,
            header_img_url,
            playtime_forever,
            playtime_2_weeks,
            has_achievements,
            status: derivedStatus,
          });
          added++;
        }
      }

      send("games_done", { added, updated, total: steamGames.length });

      const allUserGames = await Game.findAllByUser(req.session.userId);
      const gamesWithAchievements = allUserGames.filter(
        (g) => g.has_achievements,
      );

      if (gamesWithAchievements.length === 0) {
        send("done", { added, updated, total: steamGames.length });
        res.end();
        return;
      }

      send("ach_start", { total: gamesWithAchievements.length });

      for (let i = 0; i < gamesWithAchievements.length; i++) {
        const game = gamesWithAchievements[i];
        try {
          // Etap 1: schemat osiągnięć (nazwy, opisy, ikony)
          send("ach_progress", {
            current: i + 1,
            total: gamesWithAchievements.length,
            game: game.title,
            step: 1,
          });
          const schema = await getSchemaForGame(game.steam_app_id);
          for (const ach of schema) {
            await Achievement.upsert({
              game_id: game.id,
              api_name: ach.api_name,
              display_name: ach.display_name,
              description: ach.description,
              icon_url: ach.icon_url,
              icon_url_gray: ach.icon_url_gray,
              is_unlocked: 0,
              unlock_time: null,
              global_percent: null,
            });
          }

          // Etap 2: stan osiągnięć gracza — tylko is_unlocked + unlock_time
          send("ach_progress", {
            current: i + 1,
            total: gamesWithAchievements.length,
            game: game.title,
            step: 2,
          });
          const playerAchs = await getPlayerAchievements(
            user.steam_id,
            game.steam_app_id,
          );
          if (playerAchs) {
            for (const ach of playerAchs) {
              await Achievement.updateUnlockStatus(
                game.id,
                ach.api_name,
                ach.is_unlocked,
                ach.unlock_time,
              );
            }
            await Game.updateSyncTime(game.id);

            // Automatycznie oznacz jako ukończoną gdy 100% osiągnięć
            if (schema.length > 0) {
              const unlockedCount = await Achievement.countUnlocked(game.id);
              if (unlockedCount === schema.length) {
                await Game.updateStatus(game.id, "completed");
              }
            }
          }

          // Etap 3: globalny procent — tylko global_percent
          send("ach_progress", {
            current: i + 1,
            total: gamesWithAchievements.length,
            game: game.title,
            step: 3,
          });
          const globalMap = await getGlobalAchievementPercentages(
            game.steam_app_id,
          );
          for (const [api_name, percent] of globalMap) {
            await Achievement.updateGlobalPercent(game.id, api_name, percent);
          }
        } catch (achErr) {
          console.error(
            `Błąd synchronizacji osiągnięć dla gry ${game.title} (${game.steam_app_id}):`,
            achErr.message,
          );
          send("ach_error", { game: game.title, message: achErr.message });
        }
      }

      send("done", { added, updated, total: steamGames.length });
      res.end();
    } catch (err) {
      console.error("Błąd synchronizacji:", err.message);
      send("error", { message: "Błąd synchronizacji gier." });
      res.end();
    }
  },

  async getIndex(req, res) {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy(() => res.redirect("/auth/login"));
        return;
      }
      const games = await Game.findAllByUser(user.id);
      const achievementCounts = await Achievement.getCountsByUser(user.id);

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

      res.render("games", {
        title: "Gry",
        user,
        games,
        achievementCounts,
        totalHours,
        countByStatus,
        syncStatus,
        syncLabel,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("<h1>500 – Błąd serwera</h1>");
    }
  },

  async getGame(req, res) {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy(() => res.redirect("/auth/login"));
        return;
      }

      const game = await Game.findById(req.params.id);
      if (!game || game.user_id !== user.id) {
        return res.status(404).send("<h1>404 – Nie znaleziono gry</h1>");
      }

      const achievements = await Achievement.findAllByGame(game.id);

      let lastSync = game.achievements_synced_at
        ? new Date(game.achievements_synced_at)
        : null;

      const syncStatus = lastSync ? "online" : "offline";
      const syncLabel = lastSync
        ? `Steam zsynchronizowano - ${lastSync.toLocaleDateString("pl-PL")} ${lastSync.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`
        : "Steam niesynchronizowane";

      const achivPercent = achievements.length
        ? Math.round(
            (achievements.filter((a) => a.is_unlocked).length /
              achievements.length) *
              100,
          )
        : 0;

      const achivunlocked = achievements.filter((a) => a.is_unlocked).length;
      const achivtotal = achievements.length;

      const playtimeforeverHours = Math.round(
        (game.playtime_forever || 0) / 60,
      );
      const playtime2weeksHours = Math.round((game.playtime_2_weeks || 0) / 60);

      res.render("games_id", {
        title: game.title,
        user,
        game,
        header_img_url: game.header_img_url,
        app_id: game.steam_app_id,
        achievements,
        syncStatus,
        syncLabel,
        achivPercent,
        achivunlocked,
        achivtotal,
        playtimeforeverHours,
        playtime2weeksHours,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("<h1>500 – Błąd serwera</h1>");
    }
  },

  async updateStatus(req, res) {
    try {
      const game = await Game.findById(req.params.id);
      if (!game || game.user_id !== req.session.userId) {
        return res.status(404).json({ error: "Nie znaleziono gry." });
      }

      const allowed = ["tracking", "completed", "dropped", "not_played"];
      const { status } = req.body;
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: "Nieprawidłowy status." });
      }

      await Game.updateStatus(game.id, status);
      res.json({ success: true, status });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Błąd serwera." });
    }
  },
};

module.exports = gamesController;
