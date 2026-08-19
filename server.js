const app = require("./app");
const connectDatabase = require("./database");

const PORT = process.env.PORT || 3000;

async function startServer() {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

startServer().catch((error) => {
    console.error("Application failed to start:", error.message);
    process.exit(1);
});