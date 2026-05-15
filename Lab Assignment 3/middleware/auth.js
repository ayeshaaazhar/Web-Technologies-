// Ensure the user is logged in
function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) return next();
  req.flash("error", "You must be logged in to access that page.");
  res.redirect("/login");
}

// Ensure the user is an admin
function isAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.userRole === "admin") {
    return next();
  }
  req.flash("error", "Access denied. Admins only.");
  res.redirect("/");
}

module.exports = { isLoggedIn, isAdmin };