require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Permission = require("./models/Permission");
const Role = require("./models/Role");
const User = require("./models/User");
const { PERMISSIONS, ROLES } = require("./seed-data");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name}.`);
  return value;
}

async function main() {
  await mongoose.connect(required("MONGODB_URI"));
  await Promise.all([Permission.deleteMany({}), Role.deleteMany({}), User.deleteMany({})]);
  await Promise.all([Permission.init(), Role.init(), User.init()]);
  await Permission.insertMany(PERMISSIONS);
  const roles = await Role.insertMany(ROLES);
  const roleId = Object.fromEntries(roles.map((role) => [role.code, role._id]));
  const defaultPassword = required("SEED_DEFAULT_PASSWORD");
  const users = [
    { email: "gv.member.20251295@example.test", fullName: "Giảng viên kiểm tra Member", password: required("GRADER_MEMBER_PASSWORD"), roles: ["member"] },
    { email: "gv.auditor.20251295@example.test", fullName: "Giảng viên kiểm tra Auditor", password: required("GRADER_AUDITOR_PASSWORD"), roles: ["auditor"] },
    { email: "gv.manager.20251295@example.test", fullName: "Giảng viên kiểm tra Manager", password: required("GRADER_MANAGER_PASSWORD"), roles: ["user-manager"] },
    { email: "ban.ngoi.xung.quanh@example.test", fullName: "Bạn Ngồi Xung Quanh", password: defaultPassword, roles: ["member"] },
    { email: "thanh.vien.nhom@example.test", fullName: "Thành Viên Nhóm", password: defaultPassword, roles: ["auditor", "tro-giang"] },
    { email: "gv.admin.20251295@example.test", fullName: "Giảng viên kiểm tra Admin", password: required("GRADER_ADMIN_PASSWORD"), roles: ["super-admin"] },
    { email: required("STUDENT_EMAIL"), fullName: "Lê Minh Hoàng", phone: null, password: required("STUDENT_PASSWORD"), roles: ["super-admin"] },
  ];
  for (const item of users) {
    await User.create({
      email: item.email,
      fullName: item.fullName,
      phone: item.phone ?? null,
      passwordHash: await bcrypt.hash(item.password, 10),
      roles: item.roles.map((code) => roleId[code]),
    });
  }
  console.log(`Đã tạo ${PERMISSIONS.length} quyền, ${roles.length} vai trò và ${users.length} người dùng.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Seed thất bại:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
