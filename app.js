const connectDatabase = require("./database");

async function startApp() {
  await connectDatabase();

  console.log("MongoDB is connected and ready");
}

startApp().catch((error) => {
  console.error("Application failed to start:", error.message);
  process.exit(1);
});
