const User = require("../models/User");
const getPlayerSummaries = require("../services/steam/getPlayerSummaries");

const STEAM_PROFILE_REGEX =
  /^https:\/\/steamcommunity\.com\/profiles\/(\d{17})\/?$/;

const authController = {
  getRegister(req, res) {
    if (req.session.userId) return res.redirect("/dashboard");
    res.render("auth/register", {
      title: "Rejestracja",
      errors: [],
      formData: {},
    });
  },

  async postRegister(req, res) {
    const { email, password, password_confirm, steam_profile_url } = req.body;
    const errors = [];

    if (!email || !email.includes("@")) {
      errors.push("Podaj poprawny adres e-mail.");
    }
    if (!password || password.length < 6) {
      errors.push("Hasło musi mieć co najmniej 6 znaków.");
    }
    if (password !== password_confirm) {
      errors.push("Hasła nie są identyczne.");
    }

    let steam_id = null;
    if (steam_profile_url) {
      const match = steam_profile_url.trim().match(STEAM_PROFILE_REGEX);
      if (!match) {
        errors.push(
          "Podaj poprawny URL profilu Steam (np. https://steamcommunity.com/profiles/76561198927006340/).",
        );
      } else {
        steam_id = match[1];
      }
    }

    if (errors.length > 0) {
      return res.render("auth/register", {
        title: "Rejestracja",
        errors,
        formData: { email, steam_profile_url },
      });
    }

    try {
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.render("auth/register", {
          title: "Rejestracja",
          errors: ["Konto z tym adresem e-mail już istnieje."],
          formData: { email, steam_profile_url },
        });
      }

      // Pobierz dane profilu Steam jeśli podano steam_id
      let avatar_url = null;
      let username = email.split("@")[0];
      if (steam_id) {
        try {
          const player = await getPlayerSummaries(steam_id);
          if (player) {
            avatar_url = player.avatarmedium || null;
            username = player.personaname || username;
          }
        } catch (steamErr) {
          console.error("Błąd Steam API:", steamErr.message);
          // Nie blokuj rejestracji jeśli Steam API nie odpowiada
        }
      }

      const user = await User.create({
        email,
        password,
        username,
        steam_profile_url: steam_profile_url || null,
        steam_id,
        avatar_url,
      });
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      res.redirect("/dashboard");
    } catch (err) {
      console.error(err);
      res.render("auth/register", {
        title: "Rejestracja",
        errors: ["Wystąpił błąd serwera. Spróbuj ponownie."],
        formData: { email, steam_profile_url },
      });
    }
  },

  getLogin(req, res) {
    if (req.session.userId) return res.redirect("/dashboard");
    res.render("auth/login", {
      title: "Logowanie",
      errors: [],
      formData: {},
    });
  },

  async postLogin(req, res) {
    const { email, password } = req.body;
    const errors = [];

    if (!email || !password) {
      errors.push("Wypełnij wszystkie pola.");
    }

    if (errors.length > 0) {
      return res.render("auth/login", {
        title: "Logowanie",
        errors,
        formData: { email },
      });
    }

    try {
      const user = await User.findByEmail(email);
      if (!user) {
        return res.render("auth/login", {
          title: "Logowanie",
          errors: ["Nieprawidłowy e-mail lub hasło."],
          formData: { email },
        });
      }

      const valid = await User.verifyPassword(password, user.password_hash);
      if (!valid) {
        return res.render("auth/login", {
          title: "Logowanie",
          errors: ["Nieprawidłowy e-mail lub hasło."],
          formData: { email },
        });
      }

      req.session.userId = user.id;
      req.session.userEmail = user.email;
      res.redirect("/dashboard");
    } catch (err) {
      console.error(err);
      res.render("auth/login", {
        title: "Logowanie",
        errors: ["Wystąpił błąd serwera. Spróbuj ponownie."],
        formData: { email },
      });
    }
  },

  postLogout(req, res) {
    req.session.destroy(() => {
      res.redirect("/auth/login");
    });
  },
};

module.exports = authController;
