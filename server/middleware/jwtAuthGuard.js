const passport = require("passport");

// Middleware dùng chung để bảo vệ các route yêu cầu đăng nhập
// Sử dụng: app.get("/me", jwtAuthGuard, handler);
function jwtAuthGuard(req, res, next) {
  return passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      console.error("JWT Auth error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = user;
    next();
  })(req, res, next);
}

module.exports = {
  jwtAuthGuard,
};

