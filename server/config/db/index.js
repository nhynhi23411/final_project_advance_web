const mongoose = require("mongoose");

async function connect() {
  try {
    const uri =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/example_db";
    await mongoose.connect(uri);

    console.log("Kết nối MongoDB thành công! 🚀");
  } catch (error) {
    console.error("Lỗi kết nối MongoDB:", error.message);
  }
}

module.exports = { connect };
