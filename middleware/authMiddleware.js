function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect("/auth/login");
}

function requireGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect("/dashboard");
  }
  next();
}

module.exports = { requireAuth, requireGuest };
