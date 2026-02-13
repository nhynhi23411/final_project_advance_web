require("dotenv").config();
const express = require("express");
const passport = require("passport");
const app = express();
const port = process.env.PORT || 3000;

// Kết nối MongoDB
const db = require("./config/db");
db.connect();

// Middleware parse JSON body
app.use(express.json());

// Cấu hình Passport JWT
const { configurePassport } = require("./config/passport");
configurePassport(passport);
app.use(passport.initialize());

// Routes
const authRoutes = require("./routes/auth");
const { jwtAuthGuard } = require("./middleware/jwtAuthGuard");

app.get("/", (req, res) => {
  res.send("Lost & Found API server is running");
});

app.use("/auth", authRoutes);

// Ví dụ route cần đăng nhập
app.get("/me", jwtAuthGuard, (req, res) => {
  return res.json({
    message: "Thông tin người dùng hiện tại",
    user: req.user,
  });
});

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
