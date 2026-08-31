process.env.NODE_ENV = "test";
process.env.SWAGGER_ENABLED = "true";
process.env.JWT_ACCESS_SECRET = "test_access_secret";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
const mongoose = require("mongoose");
const connectDatabase = require("../database");

let mongoServer;

async function connect() {
  if (process.env.MONGODB_TEST_URI) {
    // If the developer provided a real test URI, use it.
    await connectDatabase(process.env.MONGODB_TEST_URI);
  } else {
    // Otherwise, dynamically spin up an in-memory MongoDB Replica Set (supports transactions!)
    const { MongoMemoryReplSet } = require("mongodb-memory-server");
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongoServer.getUri();
    await connectDatabase(uri);
  }
}

async function disconnect() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}

module.exports = { connect, disconnect };
