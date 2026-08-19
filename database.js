require("dotenv").config();
const mongoose = require("mongoose");

async function connectDatabase(useTestDatabase = false) {
    try {
        const uri = useTestDatabase
            ? process.env.MONGODB_TEST_URI
            : process.env.MONGODB_URI;

        await mongoose.connect(uri);

        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}

module.exports = connectDatabase;