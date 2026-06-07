require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const ConnectSQLite = require("connect-sqlite3")(session);

// Inicjalizacja bazy danych (tworzy tabele jeśli nie istnieją)
require("./config/database");

// Routing
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const gamesRoutes = require("./routes/gamesRoutes");
const achievementsRoutes = require("./routes/achievementsRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use("/css", express.static(path.join(__dirname, "assets", "css")));
app.use("/js", express.static(path.join(__dirname, "assets", "js")));
app.use("/fonts", express.static(path.join(__dirname, "assets", "fonts")));

// Body parsers
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Session
app.use(
  session({
    store: new ConnectSQLite({ db: "sessions.sqlite", dir: "." }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dni
    },
  }),
);

// Routes
app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/games", gamesRoutes);
app.use("/achievements", achievementsRoutes);

// 404 - page not found
app.use((req, res) => {
  res.status(404).send("<h1>404 – Strona nie istnieje</h1>");
});

// 500 - error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("<h1>500 – Błąd serwera</h1>");
});

app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});
