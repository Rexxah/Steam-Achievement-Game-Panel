const db = require("../config/database");

class Achievement {
  static findAllByGame(gameId) {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM achievements WHERE game_id = ? ORDER BY is_unlocked DESC, display_name ASC",
        [gameId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        },
      );
    });
  }

  static findByGameAndApiName(gameId, apiName) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM achievements WHERE game_id = ? AND api_name = ?",
        [gameId, apiName],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        },
      );
    });
  }

  static create({
    game_id,
    api_name,
    display_name,
    description,
    icon_url,
    icon_url_gray,
    is_unlocked,
    unlock_time,
    global_percent,
  }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO achievements (game_id, api_name, display_name, description, icon_url, icon_url_gray, is_unlocked, unlock_time, global_percent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          game_id,
          api_name,
          display_name || null,
          description || null,
          icon_url || null,
          icon_url_gray || null,
          is_unlocked ? 1 : 0,
          unlock_time || null,
          global_percent || null,
        ],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, game_id, api_name });
        },
      );
    });
  }

  static upsert({
    game_id,
    api_name,
    display_name,
    description,
    icon_url,
    icon_url_gray,
    is_unlocked,
    unlock_time,
    global_percent,
  }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO achievements (game_id, api_name, display_name, description, icon_url, icon_url_gray, is_unlocked, unlock_time, global_percent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(game_id, api_name) DO UPDATE SET
           is_unlocked    = excluded.is_unlocked,
           unlock_time    = excluded.unlock_time,
           global_percent = excluded.global_percent,
           display_name   = excluded.display_name,
           description    = excluded.description,
           icon_url       = excluded.icon_url,
           icon_url_gray  = excluded.icon_url_gray`,
        [
          game_id,
          api_name,
          display_name || null,
          description || null,
          icon_url || null,
          icon_url_gray || null,
          is_unlocked ? 1 : 0,
          unlock_time || null,
          global_percent || null,
        ],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, game_id, api_name });
        },
      );
    });
  }

  // Aktualizuje tylko stan odblokowania — nie nadpisuje danych ze schematu
  static updateUnlockStatus(gameId, apiName, isUnlocked, unlockTime) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE achievements SET is_unlocked = ?, unlock_time = ? WHERE game_id = ? AND api_name = ?`,
        [isUnlocked ? 1 : 0, unlockTime || null, gameId, apiName],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        },
      );
    });
  }

  // Aktualizuje tylko globalny procent — nie nadpisuje pozostałych danych
  static updateGlobalPercent(gameId, apiName, percent) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE achievements SET global_percent = ? WHERE game_id = ? AND api_name = ?`,
        [percent, gameId, apiName],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        },
      );
    });
  }

  static countUnlocked(gameId) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) as count FROM achievements WHERE game_id = ? AND is_unlocked = 1",
        [gameId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row.count);
        },
      );
    });
  }

  // Zwraca mapę { [game_id]: { total, unlocked } } dla wszystkich gier danego użytkownika
  static getCountsByUser(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT a.game_id, COUNT(*) as total, SUM(a.is_unlocked) as unlocked
         FROM achievements a
         JOIN games g ON a.game_id = g.id
         WHERE g.user_id = ?
         GROUP BY a.game_id`,
        [userId],
        (err, rows) => {
          if (err) return reject(err);
          const map = {};
          for (const row of rows) {
            map[row.game_id] = {
              total: row.total,
              unlocked: row.unlocked || 0,
            };
          }
          resolve(map);
        },
      );
    });
  }

  // legendarne osgiagniete ponizej 1% odblokowanych
  static countLegendary(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count
                FROM achievements a
                JOIN games g ON a.game_id = g.id
                WHERE g.user_id = ? AND a.is_unlocked = 1 AND a.global_percent < 1`,
        [userId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row.count);
        },
      );
    });
  }

  // Zwraca wszystkie osiągnięcia użytkownika z dołączoną nazwą gry, posortowane po rzadkości
  static findAllByUser(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT a.*, g.title as game_title, g.id as game_db_id
         FROM achievements a
         JOIN games g ON a.game_id = g.id
         WHERE g.user_id = ?
         ORDER BY CASE WHEN a.global_percent IS NULL THEN 1 ELSE 0 END,
                  a.global_percent ASC`,
        [userId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        },
      );
    });
  }

  static deleteAllByGame(gameId) {
    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM achievements WHERE game_id = ?",
        [gameId],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        },
      );
    });
  }

  // Ostatnio odblokowane osiągnięcia z nazwą gry i okładką
  static getRecentUnlocked(userId, limit = 6) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT a.*, g.title as game_title, g.id as game_db_id, g.header_img_url
         FROM achievements a
         JOIN games g ON a.game_id = g.id
         WHERE g.user_id = ? AND a.is_unlocked = 1 AND a.unlock_time IS NOT NULL
         ORDER BY a.unlock_time DESC
         LIMIT ?`,
        [userId, limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        },
      );
    });
  }
}

module.exports = Achievement;
