const mongoose = require("mongoose");
const User = require("./models/User");

mongoose.connect("mongodb://localhost:27017/adoreheaven").then(async () => {
  const existing = await User.findOne({ email: "admin@adoreheaven.com" });
  if (existing) {
    console.log("Admin already exists");
  } else {
    await User.create({
      name: "Admin",
      email: "admin@adoreheaven.com",
      password: "admin123",
      role: "admin",
    });
    console.log("Admin created: admin@adoreheaven.com / admin123");
  }
  mongoose.disconnect();
});