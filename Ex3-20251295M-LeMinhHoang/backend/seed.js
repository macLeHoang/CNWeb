require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Permission = require("./models/Permission");
const Role = require("./models/Role");
const User = require("./models/User");
const { PERMISSIONS, ROLES } = require("./seed-data");

// These classmates are fictional; example.test is reserved for test data.
const SYNTHETIC_USERS = [
  ["nguyen.minh.anh", "Nguyễn Minh Anh", ["user-manager"]],
  ["tran.quang.huy", "Trần Quang Huy", ["auditor"]],
  ["pham.thu.ha", "Phạm Thu Hà", ["member", "tro-giang"]],
  ["le.duc.anh", "Lê Đức Anh", ["member"]],
  ["hoang.thanh.tam", "Hoàng Thanh Tâm", ["member"]],
  ["vu.ngoc.linh", "Vũ Ngọc Linh", ["member"]],
  ["dang.hai.nam", "Đặng Hải Nam", ["member"]],
  ["do.mai.phuong", "Đỗ Mai Phương", ["member"]],
  ["bui.tuan.kiet", "Bùi Tuấn Kiệt", ["member"]],
  ["ngo.thao.nguyen", "Ngô Thảo Nguyên", ["member"]],
  ["duong.gia.bao", "Dương Gia Bảo", ["member"]],
  ["dinh.khanh.vy", "Đinh Khánh Vy", ["member"]],
  ["nguyen.van.an", "Nguyễn Văn An", ["member"]],
  ["tran.bao.chau", "Trần Bảo Châu", ["member"]],
  ["pham.hoang.long", "Phạm Hoàng Long", ["member"]],
  ["le.kim.ngan", "Lê Kim Ngân", ["member"]],
  ["vu.thanh.son", "Vũ Thanh Sơn", ["member"]],
  ["hoang.minh.tri", "Hoàng Minh Trí", ["member"]],
  ["do.phuong.anh", "Đỗ Phương Anh", ["member"]],
  ["bui.quoc.khanh", "Bùi Quốc Khánh", ["member"]],
];

function required(name, env = process.env) {
  const value = env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name}.`);
  return value;
}

function buildUsers(env = process.env) {
  const defaultPassword = required("SEED_DEFAULT_PASSWORD", env);
  const users = [
    { email: env.STUDENT_EMAIL || "20251295m@example.test", fullName: "Lê Minh Hoàng", password: required("STUDENT_PASSWORD", env), roles: ["super-admin"] },
    ...SYNTHETIC_USERS.map(([email, fullName, roles], index) => ({ email: `${email}@example.test`, fullName, roles, phone: `+849${10000000 + index}`, password: defaultPassword })),
    ...[["admin", "super-admin"], ["manager", "user-manager"], ["auditor", "auditor"], ["member", "member"]].map(([key, code]) => ({
      email: `gv.${key}.20251295@example.test`, fullName: `Tài khoản kiểm tra ${code}`, roles: [code], password: required(`GRADER_${key.toUpperCase()}_PASSWORD`, env),
    })),
  ];
  const strong = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  for (const user of users) if (!strong.test(user.password)) throw new Error(`Mật khẩu seed của ${user.email} chưa đủ mạnh.`);
  return users;
}

async function seedDatabase(env = process.env, { reset = false } = {}) {
  // Validate inputs BEFORE deleting anything. Existing data requires explicit --reset.
  const users = buildUsers(env);
  if (await User.exists({}) && !reset) throw new Error("Database đã có dữ liệu. Dùng --reset nếu muốn tạo lại ba collection RBAC.");
  if (reset) await Promise.all([Permission.deleteMany({}), Role.deleteMany({}), User.deleteMany({})]);
  await Promise.all([Permission.init(), Role.init(), User.init()]);
  await Permission.insertMany(PERMISSIONS);
  const roles = await Role.insertMany(ROLES);
  const roleId = Object.fromEntries(roles.map((role) => [role.code, role._id]));
  const timestamp = Date.now();
  for (const [index, item] of users.entries()) {
    await User.create({
      email: item.email,
      fullName: item.fullName,
      phone: item.phone ?? null,
      passwordHash: await bcrypt.hash(item.password, 10),
      roles: item.roles.map((code) => roleId[code]),
      createdAt: new Date(timestamp - index * 1000),
    });
  }
  return { permissions: PERMISSIONS.length, roles: roles.length, users: users.length, synthetic: true };
}

async function main() {
  buildUsers();
  await mongoose.connect(required("MONGODB_URI"));
  console.log("DỮ LIỆU GIẢ LẬP – không phải danh sách thành viên thực tế.");
  console.log(await seedDatabase(process.env, { reset: process.argv.includes("--reset") }));
}

if (require.main === module) main().catch((error) => {
  console.error("Seed thất bại:", error.message);
  process.exitCode = 1;
}).finally(async () => { await mongoose.disconnect(); });

module.exports = { seedDatabase, buildUsers, SYNTHETIC_USERS };
