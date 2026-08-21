require("dotenv").config();
const app = require("./app");
const connectDatabase = require("./database");

const mongoose = require("mongoose");

const PORT = process.env.PORT || 3000;

async function startServer() {
    await connectDatabase(process.env.MONGODB_URI);

    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

    async function shutdown(signal) {
        console.log(`${signal} received, shutting down`);
        
        // Ensure idle keep-alive connections don't block the graceful shutdown
        if (server.closeIdleConnections) {
            server.closeIdleConnections();
        }

        server.close(async () => {
            console.log("HTTP server closed.");
            try {
                await mongoose.disconnect();
                console.log("MongoDB disconnected.");
                process.exit(0);
            } catch (err) {
                console.error("Error during MongoDB disconnect:", err);
                process.exit(1);
            }
        });

        setTimeout(() => {
            console.error("Forced shutdown after timeout");
            process.exit(1);
        }, 10_000).unref();
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((error) => {
    console.error("Application failed to start:", error.message);
    process.exit(1);
});