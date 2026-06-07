const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "database.sqlite");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Błąd połączenia z bazą danych:", err.message);
    process.exit(1);
  }
  console.log("Połączono z bazą danych SQLite.");
});

db.serialize(() => {
  db.run(
    `
    CREATE TABLE IF NOT EXISTS users (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      username          TEXT,
      email             TEXT UNIQUE NOT NULL,
      password_hash     TEXT NOT NULL,
      steam_profile_url TEXT,
      steam_id          TEXT,
      avatar_url        TEXT,
      created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (err) => {
      if (err) console.error("Błąd tworzenia tabeli users:", err.message);
      else console.log("Tabela users gotowa.");
    },
  );

  // Dodaj kolumnę avatar_url jeśli tabela istniała przed tą zmianą
  db.run(`ALTER TABLE users ADD COLUMN avatar_url TEXT`, () => {});

  // Dodaj kolumnę has_achievements jeśli tabela istniała przed tą zmianą
  db.run(
    `ALTER TABLE games ADD COLUMN has_achievements INTEGER DEFAULT 0`,
    () => {},
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS games (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id                INTEGER NOT NULL,
      steam_app_id           TEXT NOT NULL,
      title                  TEXT NOT NULL,
      header_img_url         TEXT,
      playtime_forever       INTEGER DEFAULT 0,
      playtime_2_weeks       INTEGER DEFAULT 0,
      has_achievements       INTEGER DEFAULT 0,
      achievements_synced_at DATETIME,
      status                 TEXT CHECK(status IN ('tracking', 'completed', 'dropped', 'not_played')) DEFAULT 'not_played',
      created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,
    (err) => {
      if (err) console.error("Błąd tworzenia tabeli games:", err.message);
      else console.log("Tabela games gotowa.");
    },
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS achievements (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id        INTEGER NOT NULL,
      api_name       TEXT NOT NULL,
      display_name   TEXT,
      description    TEXT,
      icon_url       TEXT,
      icon_url_gray  TEXT,
      is_unlocked    INTEGER DEFAULT 0,
      unlock_time    DATETIME,
      global_percent REAL,
      UNIQUE (game_id, api_name),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `,
    (err) => {
      if (err)
        console.error("Błąd tworzenia tabeli achievements:", err.message);
      else console.log("Tabela achievements gotowa.");
    },
  );

  // Zapewnia unikalny indeks (game_id, api_name) dla ON CONFLICT w upsert
  // Działa zarówno dla nowych jak i istniejących baz bez tego constraintu
  db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_game_api ON achievements(game_id, api_name)`,
    (err) => {
      if (err)
        console.error("Błąd tworzenia indeksu achievements:", err.message);
    },
  );
});

module.exports = db;
