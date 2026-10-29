const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Permission = require("../models/Permission");
const Role = require("../models/Role");
const User = require("../models/User");
const { PERMISSIONS, ROLES } = require("../seed-data");

let mongo;
let api;
let roles;
let users;
let tokens;
let createdUser;

async function addUser(email, fullName, roleCodes, status = "active") {
  return User.create({
    email,
    fullName,
    passwordHash: await bcrypt.hash("Valid@2026", 4),
    roles: roleCodes.map((code) => roles[code]._id),
    status,
  });
}

async function login(email, password = "Valid@2026") {
  const response = await api.post("/api/v1/auth/tokens").send({ grantType: "password", email, password });
  assert.equal(response.status, 200);
  return response.body.accessToken;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  process.env.JWT_SECRET = "test-secret-that-is-long-enough";
  process.env.ACCESS_TOKEN_TTL = "3600";
  process.env.CORS_ORIGINS = "http://127.0.0.1:5500";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Permission.insertMany(PERMISSIONS);
  const insertedRoles = await Role.insertMany(ROLES);
  roles = Object.fromEntries(insertedRoles.map((role) => [role.code, role]));
  roles.empty = await Role.create({ code: "empty-role", name: "Vai trò rỗng", permissions: [] });
  users = {
    admin: await addUser("admin@example.test", "Quản trị viên", ["super-admin"]),
    manager: await addUser("manager@example.test", "Quản lý người dùng", ["user-manager"]),
    auditor: await addUser("auditor@example.test", "Kiểm toán viên", ["auditor"]),
    member: await addUser("member@example.test", "Thành viên", ["member"]),
    custom: await addUser("custom@example.test", "Trợ giảng", ["tro-giang"]),
    locked: await addUser("locked@example.test", "Tài khoản khóa", ["member"], "locked"),
  };
  const createApp = require("../app");
  api = request(createApp());
  tokens = {
    admin: await login(users.admin.email),
    manager: await login(users.manager.email),
    auditor: await login(users.auditor.email),
    member: await login(users.member.email),
  };
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test("T01–T24 contract", async (t) => {
  await t.test("T01 missing token", async () => {
    const response = await api.get("/api/v1/users");
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, "UNAUTHENTICATED");
  });
  await t.test("T02 member is forbidden", async () => {
    const response = await api.get("/api/v1/users").set(auth(tokens.member));
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, "FORBIDDEN");
  });
  await t.test("T03 paging metadata", async () => {
    const response = await api.get("/api/v1/users?page=2&limit=3&sort=fullName").set(auth(tokens.auditor));
    assert.equal(response.status, 200);
    assert.equal(response.body.meta.page, 2);
    assert.equal(response.body.meta.limit, 3);
  });
  await t.test("T04 search and status filter", async () => {
    const response = await api.get("/api/v1/users?q=kiem&status=active").set(auth(tokens.auditor));
    assert.equal(response.status, 200);
    assert.ok(response.body.data.every((item) => item.status === "active"));
  });
  await t.test("T05 invalid limit", async () => {
    const response = await api.get("/api/v1/users?limit=500").set(auth(tokens.auditor));
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "INVALID_QUERY_PARAMETER");
  });
  await t.test("T06 create user", async () => {
    const response = await api.post("/api/v1/users").set(auth(tokens.manager)).send({
      email: "created@example.test", fullName: "Người dùng mới", password: "Valid@2026",
    });
    assert.equal(response.status, 201);
    assert.match(response.headers.location, /\/api\/v1\/users\//);
    assert.equal(response.body.passwordHash, undefined);
    createdUser = response.body;
  });
  await t.test("T07 duplicate email", async () => {
    const response = await api.post("/api/v1/users").set(auth(tokens.manager)).send({ email: "created@example.test", fullName: "Trùng Email", password: "Valid@2026" });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "EMAIL_ALREADY_EXISTS");
  });
  await t.test("T08 weak password", async () => {
    const response = await api.post("/api/v1/users").set(auth(tokens.manager)).send({ email: "weak@example.test", fullName: "Mật khẩu yếu", password: "123" });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.details.find((item) => item.field === "password").issue, "WEAK_PASSWORD");
  });
  await t.test("T09 privilege escalation while creating", async () => {
    const response = await api.post("/api/v1/users").set(auth(tokens.manager)).send({ email: "escalate@example.test", fullName: "Vượt quyền", password: "Valid@2026", roleIds: [String(roles["super-admin"]._id)] });
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, "PRIVILEGE_ESCALATION");
  });
  await t.test("T10 partial update", async () => {
    const response = await api.patch(`/api/v1/users/${createdUser.id}`).set(auth(tokens.manager)).send({ phone: "+84911222333" });
    assert.equal(response.status, 200);
    assert.equal(response.body.phone, "+84911222333");
    assert.equal(response.body.email, createdUser.email);
  });
  await t.test("T11 rejects roles in patch", async () => {
    const response = await api.patch(`/api/v1/users/${createdUser.id}`).set(auth(tokens.manager)).send({ roles: [] });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.details[0].issue, "FIELD_NOT_ALLOWED");
  });
  await t.test("T12 cannot lock self", async () => {
    const response = await api.patch(`/api/v1/users/${users.manager._id}`).set(auth(tokens.manager)).send({ status: "locked" });
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, "SELF_ACTION_FORBIDDEN");
  });
  await t.test("T13 assigning role is idempotent", async () => {
    for (let index = 0; index < 2; index += 1) {
      const response = await api.put(`/api/v1/users/${createdUser.id}/roles/${roles.auditor._id}`).set(auth(tokens.manager));
      assert.equal(response.status, 204);
    }
    const stored = await User.findById(createdUser.id);
    assert.equal(stored.roles.filter((id) => String(id) === String(roles.auditor._id)).length, 1);
  });
  await t.test("T14 manager cannot assign super-admin", async () => {
    const response = await api.put(`/api/v1/users/${createdUser.id}/roles/${roles["super-admin"]._id}`).set(auth(tokens.manager));
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, "PRIVILEGE_ESCALATION");
  });
  await t.test("T15 revoked permissions take effect immediately", async () => {
    const removed = await api.delete(`/api/v1/users/${users.manager._id}/roles/${roles["user-manager"]._id}`).set(auth(tokens.admin));
    assert.equal(removed.status, 204);
    const response = await api.get("/api/v1/users").set(auth(tokens.manager));
    assert.equal(response.status, 403);
  });
  await t.test("T16 manager cannot delete", async () => {
    const response = await api.delete(`/api/v1/users/${createdUser.id}`).set(auth(tokens.manager));
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, "FORBIDDEN");
  });
  await t.test("T17 soft delete", async () => {
    const response = await api.delete(`/api/v1/users/${createdUser.id}`).set(auth(tokens.admin));
    assert.equal(response.status, 204);
    assert.equal((await api.get(`/api/v1/users/${createdUser.id}`).set(auth(tokens.admin))).status, 404);
    const loginResponse = await api.post("/api/v1/auth/tokens").send({ grantType: "password", email: createdUser.email, password: "Valid@2026" });
    assert.equal(loginResponse.status, 401);
  });
  await t.test("T18 malformed ObjectId is 404", async () => {
    const response = await api.get("/api/v1/users/abc").set(auth(tokens.admin));
    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, "USER_NOT_FOUND");
  });
  await t.test("T19 duplicate role code", async () => {
    const response = await api.post("/api/v1/roles").set(auth(tokens.admin)).send({ code: "member", name: "Trùng", permissions: [] });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "ROLE_CODE_EXISTS");
  });
  await t.test("T20 protects system role permissions", async () => {
    const response = await api.put(`/api/v1/roles/${roles.member._id}/permissions`).set(auth(tokens.admin)).send({ permissions: [] });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "SYSTEM_ROLE_PROTECTED");
  });
  await t.test("T21 cannot delete role in use", async () => {
    const response = await api.delete(`/api/v1/roles/${roles["tro-giang"]._id}`).set(auth(tokens.admin));
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "ROLE_IN_USE");
  });
  await t.test("T22 rejects unknown permission", async () => {
    const response = await api.put(`/api/v1/roles/${roles.empty._id}/permissions`).set(auth(tokens.admin)).send({ permissions: ["users:fly"] });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "PERMISSION_NOT_FOUND");
  });
  await t.test("T23 ignores client-provided role header", async () => {
    const response = await api.post("/api/v1/users").set({ ...auth(tokens.member), "X-User-Role": "admin" }).send({ email: "hack@example.test", fullName: "Hack", password: "Valid@2026" });
    assert.equal(response.status, 403);
  });
  await t.test("T24 malformed JSON", async () => {
    const response = await api.post("/api/v1/users").set({ ...auth(tokens.admin), "Content-Type": "application/json" }).send('{"email":');
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "MALFORMED_JSON");
  });
});

test("Các endpoint và hành vi bổ sung", async (t) => {
  await t.test("JWT có sub sai vẫn trả 401 JSON", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ sub: "not-an-object-id" }, process.env.JWT_SECRET);
    const response = await api.get("/api/v1/me").set(auth(token));
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, "INVALID_TOKEN");
  });
  await t.test("Bảo vệ super-admin active cuối cùng với người gọi khác", async () => {
    roles.operator = await Role.create({ code: "operator-check", name: "Nhân sự kiểm thử", permissions: PERMISSIONS.map((permission) => permission.code) });
    const operator = await addUser("operator@example.test", "Người kiểm thử bảo vệ", ["operator"]);
    const token = await login(operator.email);
    for (const response of [
      await api.patch(`/api/v1/users/${users.admin._id}`).set(auth(token)).send({ status: "locked" }),
      await api.delete(`/api/v1/users/${users.admin._id}`).set(auth(token)),
      await api.delete(`/api/v1/users/${users.admin._id}/roles/${roles["super-admin"]._id}`).set(auth(token)),
    ]) {
      assert.equal(response.status, 409);
      assert.equal(response.body.error.code, "LAST_SUPER_ADMIN");
    }
    assert.equal((await User.findById(users.admin._id)).status, "active");
  });
  await t.test("Email vẫn duy nhất sau xóa mềm; regex đặc biệt được escape", async () => {
    const duplicate = await api.post("/api/v1/users").set(auth(tokens.admin)).send({ email: createdUser.email, fullName: "Không dùng lại email", password: "Valid@2026" });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, "EMAIL_ALREADY_EXISTS");
    const response = await api.get("/api/v1/users?q=(((").set(auth(tokens.admin));
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, []);
  });
  await t.test("GET /me trả profile và quyền đã sắp xếp", async () => {
    const response = await api.get("/api/v1/me").set(auth(tokens.admin));
    assert.equal(response.status, 200);
    assert.equal(response.body.id, String(users.admin._id));
    assert.deepEqual(response.body.permissions, [...response.body.permissions].sort());
    assert.equal(response.body.passwordHash, undefined);
  });
  await t.test("token sai và tài khoản khóa trả đúng mã", async () => {
    const invalid = await api.get("/api/v1/me").set(auth("not-a-token"));
    assert.equal(invalid.status, 401);
    assert.equal(invalid.body.error.code, "INVALID_TOKEN");
    const locked = await api.post("/api/v1/auth/tokens").send({ grantType: "password", email: users.locked.email, password: "Valid@2026" });
    assert.equal(locked.status, 403);
    assert.equal(locked.body.error.code, "ACCOUNT_LOCKED");
  });
  await t.test("CRUD vai trò tùy chỉnh và danh mục quyền", async () => {
    const catalog = await api.get("/api/v1/permissions?resource=users").set(auth(tokens.admin));
    assert.equal(catalog.status, 200);
    assert.equal(catalog.body.meta.totalItems, 4);

    const created = await api.post("/api/v1/roles").set(auth(tokens.admin)).send({
      code: "qa-role", name: "Vai trò QA", description: "Kiểm thử", permissions: ["users:read"],
    });
    assert.equal(created.status, 201);
    const roleId = created.body.id;
    assert.match(created.headers.location, new RegExp(`${roleId}$`));

    const detailResponse = await api.get(`/api/v1/roles/${roleId}`).set(auth(tokens.admin));
    assert.equal(detailResponse.status, 200);
    assert.equal(detailResponse.body.userCount, 0);
    const permissionResponse = await api.get(`/api/v1/roles/${roleId}/permissions`).set(auth(tokens.admin));
    assert.equal(permissionResponse.status, 200);
    assert.equal(permissionResponse.body.data[0].code, "users:read");

    const patched = await api.patch(`/api/v1/roles/${roleId}`).set(auth(tokens.admin)).send({ name: "Vai trò QA mới" });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.name, "Vai trò QA mới");
    const replaced = await api.put(`/api/v1/roles/${roleId}/permissions`).set(auth(tokens.admin)).send({ permissions: ["users:read", "roles:read"] });
    assert.equal(replaced.status, 200);
    assert.deepEqual(new Set(replaced.body.permissions), new Set(["users:read", "roles:read"]));

    assert.equal((await api.delete(`/api/v1/roles/${roleId}`).set(auth(tokens.admin))).status, 204);
    assert.equal((await api.get(`/api/v1/roles/${roleId}`).set(auth(tokens.admin))).status, 404);
  });
  await t.test("CORS preflight và endpoint không tồn tại", async () => {
    const preflight = await api.options("/api/v1/users/anything")
      .set("Origin", "http://127.0.0.1:5500")
      .set("Access-Control-Request-Method", "PATCH")
      .set("Access-Control-Request-Headers", "authorization,content-type");
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers["access-control-allow-origin"], "http://127.0.0.1:5500");
    const missing = await api.get("/api/v1/not-real");
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, "ENDPOINT_NOT_FOUND");
  });
});
