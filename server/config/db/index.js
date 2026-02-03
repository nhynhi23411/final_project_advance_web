const mongoose = require("mongoose");

async function connect() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/example_db");

    console.log("Connect thành công! 🚀");
  } catch (error) {
    console.error("Lỗi kết nối MongoDB:", error.message);
  }
}

module.exports = { connect };
