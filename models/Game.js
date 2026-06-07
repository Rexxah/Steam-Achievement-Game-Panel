const db = require("../config/database");

class Game {
  static findAllByUser(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM games WHERE user_id = ? ORDER BY title ASC",
        [userId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        },
      );
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM games WHERE id = ?", [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static findByUserAndAppId(userId, steamAppId) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM games WHERE user_id = ? AND steam_app_id = ?",
        [userId, steamAppId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        },
      );
    });
  }

  static create({
    user_id,
    steam_app_id,
    title,
    header_img_url,
    playtime_forever,
    playtime_2_weeks,
    has_achievements,
    status,
  }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO games (user_id, steam_app_id, title, header_img_url, playtime_forever, playtime_2_weeks, has_achievements, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          steam_app_id,
          title,
          header_img_url || null,
          playtime_forever || 0,
          playtime_2_weeks || 0,
          has_achievements ? 1 : 0,
          status || "not_played",
        ],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, user_id, steam_app_id, title });
        },
      );
    });
  }

  // Aktualizuje pola synchronizowane ze Steam, nie nadpisuje statusu ustawionego przez użytkownika
  // Wyjątek: jeśli status był 'not_played' i playtime > 0, zmień na 'tracking'
  static updateFromSync(
    id,
    {
      playtime_forever,
      playtime_2_weeks,
      has_achievements,
      currentStatus,
      derivedStatus,
    },
  ) {
    const newStatus =
      currentStatus === "not_played" && derivedStatus === "tracking"
        ? "tracking"
        : currentStatus;
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE games SET playtime_forever = ?, playtime_2_weeks = ?, has_achievements = ?, status = ? WHERE id = ?`,
        [
          playtime_forever,
          playtime_2_weeks,
          has_achievements ? 1 : 0,
          newStatus,
          id,
        ],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        },
      );
    });
  }

  static updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE games SET status = ? WHERE id = ?",
        [status, id],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        },
      );
    });
  }

  static updateSyncTime(id) {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE games SET achievements_synced_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        },
      );
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM games WHERE id = ?", [id], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  }
}

module.exports = Game;
