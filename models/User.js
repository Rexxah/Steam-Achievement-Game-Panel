const db = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT id, username, email, steam_profile_url, steam_id, avatar_url, created_at FROM users WHERE id = ?",
        [id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        },
      );
    });
  }

  static async create({
    email,
    password,
    username,
    steam_profile_url,
    steam_id,
    avatar_url,
  }) {
    const password_hash = await bcrypt.hash(password, 12);
    const resolvedUsername = username || email.split("@")[0];

    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (username, email, password_hash, steam_profile_url, steam_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?)",
        [
          resolvedUsername,
          email,
          password_hash,
          steam_profile_url || null,
          steam_id || null,
          avatar_url || null,
        ],
        function (err) {
          if (err) return reject(err);
          resolve({
            id: this.lastID,
            username: resolvedUsername,
            email,
            steam_profile_url,
            steam_id,
            avatar_url,
          });
        },
      );
    });
  }

  static async verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}

module.exports = User;
