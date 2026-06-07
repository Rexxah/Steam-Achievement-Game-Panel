const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/dashboard");
  }
  res.redirect("/auth/login");
});

module.exports = router;
