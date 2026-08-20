const mongoose = require("mongoose");

async function connectDatabase(uri) {
  if (!uri) {
    throw new Error("Missing MONGODB_URI or MONGODB_TEST_URI. Copy .env.example to .env and fill it in.");
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

module.exports = connectDatabase;
