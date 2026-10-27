require("dotenv").config();
const mongoose = require("mongoose");
const createApp = require("./app");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const port = Number(process.env.PORT || 3001);
  createApp().listen(port, "0.0.0.0", () => console.log(`Server running on http://localhost:${port}`));
}

main().catch((error) => {
  console.error("Không thể khởi động server:", error.message);
  process.exit(1);
});
