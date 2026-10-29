// Persistent local demo. npm start never uses this runner or its demo credentials.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const express = require("express");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../models/User");
const { seedDatabase } = require("../seed");
const PASSWORD = "Demo@2026";

async function startDemo() {
  const runtime = path.resolve(__dirname, "../.runtime/mongo");
  fs.mkdirSync(runtime, { recursive: true });
  const mongo = await MongoMemoryServer.create({ instance: { dbPath: runtime, dbName: "it4409_rbac_demo", storageEngine: "wiredTiger" } });
  process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
  process.env.ACCESS_TOKEN_TTL = "3600";
  process.env.CORS_ORIGINS = "http://127.0.0.1:5500,http://localhost:5500";
  await mongoose.connect(mongo.getUri());
  const env = Object.fromEntries(["STUDENT_PASSWORD", "SEED_DEFAULT_PASSWORD", "GRADER_ADMIN_PASSWORD", "GRADER_MANAGER_PASSWORD", "GRADER_AUDITOR_PASSWORD", "GRADER_MEMBER_PASSWORD"].map((name) => [name, PASSWORD]));
  if (!(await User.exists({}))) console.log("Seed:", await seedDatabase(env));
  const api = require("../app")().listen(3001, "127.0.0.1");
  const web = express();
  web.use(express.static(path.resolve(__dirname, "../../frontend")));
  const frontend = web.listen(5500, "127.0.0.1");
  console.log("DEMO READY http://127.0.0.1:5500 – API http://127.0.0.1:3001/api/v1");
  console.log("Synthetic student: 20251295m@example.test / Demo@2026");
  console.log("Demo only. Persistent data: backend/.runtime. Stop with Ctrl+C.");
  let stopping = false;
  const close = async () => {
    if (stopping) return;
    stopping = true;
    api.close(); frontend.close();
    await mongoose.disconnect(); await mongo.stop();
    process.exit(0);
  };
  process.on("SIGINT", close); process.on("SIGTERM", close);
  return { close, api, mongo };
}
if (require.main === module) startDemo().catch((error) => { console.error(error); process.exit(1); });
module.exports = { startDemo, PASSWORD };
