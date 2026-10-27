const PERMISSIONS = [
  ["users:read", "Xem danh sách và chi tiết người dùng"],
  ["users:create", "Tạo người dùng"],
  ["users:update", "Sửa thông tin, khóa/mở khóa người dùng"],
  ["users:delete", "Xóa người dùng"],
  ["roles:read", "Xem vai trò và quyền của vai trò"],
  ["roles:create", "Tạo vai trò"],
  ["roles:update", "Sửa vai trò, thay bộ quyền của vai trò"],
  ["roles:delete", "Xóa vai trò"],
  ["roles:assign", "Gán / gỡ vai trò cho người dùng"],
  ["permissions:read", "Xem danh mục quyền"],
].map(([code, description]) => ({ code, resource: code.split(":")[0], action: code.split(":")[1], description }));

const ALL = PERMISSIONS.map((item) => item.code);
const ROLES = [
  { code: "super-admin", name: "Quản trị viên tối cao", isSystem: true, permissions: ALL },
  { code: "user-manager", name: "Quản lý người dùng", isSystem: true, permissions: ["users:read", "users:create", "users:update", "roles:read", "roles:assign", "permissions:read"] },
  { code: "auditor", name: "Kiểm toán viên", isSystem: true, permissions: ["users:read", "users:update", "permissions:read"] },
  { code: "member", name: "Thành viên", isSystem: true, permissions: [] },
  { code: "tro-giang", name: "Trợ giảng", description: "Vai trò tùy chỉnh dùng để hỗ trợ kiểm tra danh sách", isSystem: false, permissions: ["users:read", "roles:read"] },
];

module.exports = { PERMISSIONS, ROLES };
