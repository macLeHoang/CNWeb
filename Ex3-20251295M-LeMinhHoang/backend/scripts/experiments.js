const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { seedDatabase } = require("../seed");
const User = require("../models/User");
const Role = require("../models/Role");

async function main() {
  const evidence = path.resolve(__dirname, "../../evidence");
  fs.mkdirSync(evidence, { recursive: true });
  process.env.JWT_SECRET = "isolated-experiment-secret-local-only";
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  try {
    const env = Object.fromEntries(["STUDENT_PASSWORD", "SEED_DEFAULT_PASSWORD", "GRADER_ADMIN_PASSWORD", "GRADER_MANAGER_PASSWORD", "GRADER_AUDITOR_PASSWORD", "GRADER_MEMBER_PASSWORD"].map((key) => [key, "Demo@2026"]));
    await seedDatabase(env);
    const app = require("../app")();
    const api = request(app);
    const login = async (email) => {
      const result = await api.post("/api/v1/auth/tokens").send({ grantType: "password", email, password: "Demo@2026" });
      assert.equal(result.status, 200); return result.body.accessToken;
    };
    const manager = await login("gv.manager.20251295@example.test");
    const admin = await login("20251295m@example.test");
    const target = await User.findOne({ email: "le.duc.anh@example.test" });
    const auditorRole = await Role.findOne({ code: "auditor" });
    const managerRole = await Role.findOne({ code: "user-manager" });
    const managerUser = await User.findOne({ email: "gv.manager.20251295@example.test" });

    // Actual authenticate middleware, observed by a temporary local wrapper.
    const traceApp = express();
    const { authenticate } = require("../middleware/auth");
    let permissions;
    traceApp.use(authenticate, (req, res, next) => { permissions = [...req.permissions].sort(); console.log("req.permissions", permissions); next(); });
    traceApp.use("/api/v1/users", require("../routes/users"));
    const assigned = await request(traceApp).put(`/api/v1/users/${target._id}/roles/${auditorRole._id}`).auth(manager, { type: "bearer" });
    assert.equal(assigned.status, 204);

    // Load an isolated in-memory copy of the real route with escaping disabled.
    // No tracked file is edited; production routing remains unchanged.
    const filename = require.resolve("../routes/users");
    const source = fs.readFileSync(filename, "utf8");
    const changed = source.replace("$regex: escapeRegex(keyword)", "$regex: keyword");
    assert.notEqual(changed, source);
    const brokenModule = new Module(filename, module);
    brokenModule.filename = filename;
    brokenModule.paths = Module._nodeModulePaths(path.dirname(filename));
    brokenModule._compile(changed, filename);
    const brokenApp = express();
    brokenApp.use("/api/v1/users", brokenModule.exports);
    let observedError;
    brokenApp.use((error, req, res, next) => { observedError = error.message; res.status(500).json({ error: { code: "INTERNAL_ERROR" } }); });
    const broken = await request(brokenApp).get("/api/v1/users?q=(((").auth(manager, { type: "bearer" });
    const restored = await api.get("/api/v1/users?q=(((").auth(manager, { type: "bearer" });
    assert.equal(broken.status, 500); assert.equal(restored.status, 200);

    const before = await api.get("/api/v1/users").auth(manager, { type: "bearer" });
    const remove = await api.delete(`/api/v1/users/${managerUser._id}/roles/${managerRole._id}`).auth(admin, { type: "bearer" });
    const after = await api.get("/api/v1/users").auth(manager, { type: "bearer" });
    assert.equal(before.status, 200); assert.equal(remove.status, 204); assert.equal(after.status, 403);

    const report = {
      at: new Date().toISOString(), environment: "Isolated LOCAL database; synthetic data",
      trace: { request: "PUT /users/:userId/roles/:roleId", permissions, status: assigned.status, observation: "Temporary wrapper around actual authenticate; production file not edited" },
      mutation: { query: "q=(((", changedExpression: "$regex: escapeRegex(keyword) -> $regex: keyword", brokenStatus: broken.status, actualError: observedError, restoredStatus: restored.status, sourceUnchanged: fs.readFileSync(filename, "utf8") === source },
      revocation: { tokenReused: true, before: before.status, deleteRole: remove.status, after: after.status, code: after.body.error.code },
    };
    fs.writeFileSync(path.join(evidence, "experiments.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await mongoose.disconnect(); await mongo.stop(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
