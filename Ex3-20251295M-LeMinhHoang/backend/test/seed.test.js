const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildUsers, SYNTHETIC_USERS } = require("../seed");

const env = Object.fromEntries(["SEED_DEFAULT_PASSWORD", "STUDENT_PASSWORD", "GRADER_ADMIN_PASSWORD", "GRADER_MANAGER_PASSWORD", "GRADER_AUDITOR_PASSWORD", "GRADER_MEMBER_PASSWORD"].map((key) => [key, "Demo@2026"]));

test("Synthetic seed has distinct emails, all required roles and student first", () => {
  const users = buildUsers(env);
  assert.equal(users.length, 25);
  assert.equal(SYNTHETIC_USERS.length, 20);
  assert.equal(new Set(users.map((user) => user.email)).size, users.length);
  assert.equal(users[0].fullName, "Lê Minh Hoàng");
  for (const code of ["super-admin", "user-manager", "auditor", "member", "tro-giang"]) assert.ok(users.some((user) => user.roles.includes(code)));
  assert.ok(users.every((user) => user.email.endsWith("@example.test")));
});

test("Seed checks all password configuration before connecting or deleting", () => {
  assert.throws(() => buildUsers({ ...env, GRADER_ADMIN_PASSWORD: "" }), /GRADER_ADMIN_PASSWORD/);
  assert.throws(() => buildUsers({ ...env, STUDENT_PASSWORD: "123" }), /chưa đủ mạnh/);
});
