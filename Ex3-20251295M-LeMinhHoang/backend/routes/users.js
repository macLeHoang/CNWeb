const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const { authenticate, requirePermission } = require("../middleware/auth");
const { missingPermissions, isLastSuperAdmin } = require("../utils/rbac");
const {
  fail, detail, notAllowedFields, unknownQueryFields, isObjectId, parsePaging,
  parseSort, escapeRegex, pageMeta, userView, roleSummary,
} = require("../utils/http");

const router = express.Router();
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
router.use(authenticate);

async function loadUser(req, res, next) {
  const user = isObjectId(req.params.userId)
    ? await User.findOne({ _id: req.params.userId, status: { $ne: "deleted" } }).populate("roles")
    : null;
  if (!user) return fail(res, 404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
  req.target = user;
  return next();
}

async function loadRole(req, res, next) {
  const role = isObjectId(req.params.roleId) ? await Role.findById(req.params.roleId) : null;
  if (!role) return fail(res, 404, "ROLE_NOT_FOUND", "Không tìm thấy vai trò.");
  req.role = role;
  return next();
}

router.get("/", requirePermission("users:read"), async (req, res) => {
  const details = unknownQueryFields(req.query, ["q", "status", "roleId", "sort", "page", "limit"]);
  const { page, limit } = parsePaging(req.query, details);
  const sort = parseSort(req.query.sort || "-createdAt", ["fullName", "email", "createdAt", "lastLoginAt"], details);
  if (req.query.status && !["active", "locked"].includes(req.query.status)) details.push(detail("status", "INVALID_VALUE", "status phải là active hoặc locked."));
  if (req.query.roleId && !isObjectId(req.query.roleId)) details.push(detail("roleId", "INVALID_VALUE", "roleId không hợp lệ."));
  const keyword = req.query.q === undefined ? "" : String(req.query.q).trim();
  if (req.query.q !== undefined && keyword.length < 2) details.push(detail("q", "TOO_SHORT", "q phải có ít nhất 2 ký tự."));
  if (details.length) return fail(res, 400, "INVALID_QUERY_PARAMETER", "Tham số truy vấn không hợp lệ.", details);

  const filter = { status: req.query.status || { $ne: "deleted" } };
  if (req.query.roleId) filter.roles = req.query.roleId;
  if (keyword) {
    const pattern = { $regex: escapeRegex(keyword), $options: "i" };
    filter.$or = [{ fullName: pattern }, { email: pattern }];
  }
  const [items, totalItems] = await Promise.all([
    User.find(filter).sort({ ...sort, _id: 1 }).skip((page - 1) * limit).limit(limit).populate("roles"),
    User.countDocuments(filter),
  ]);
  return res.json({ data: items.map(userView), meta: pageMeta(page, limit, totalItems) });
});

router.post("/", requirePermission("users:create"), async (req, res) => {
  const body = req.body || {};
  const details = notAllowedFields(body, ["email", "fullName", "phone", "password", "roleIds"]);
  if (!body.password) details.push(detail("password", "REQUIRED", "Mật khẩu không được để trống."));
  else if (!PASSWORD_RE.test(String(body.password))) details.push(detail("password", "WEAK_PASSWORD", "Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ số và ký tự đặc biệt."));
  if (body.roleIds !== undefined && (!Array.isArray(body.roleIds) || !body.roleIds.every(isObjectId))) {
    details.push(detail("roleIds", "INVALID_TYPE", "roleIds phải là mảng ObjectId hợp lệ."));
  }
  if (details.length) return fail(res, 400, "VALIDATION_ERROR", "Dữ liệu đầu vào không hợp lệ.", details);

  let roles;
  const roleIds = [...new Set(body.roleIds || [])];
  if (roleIds.length) {
    if (!req.permissions.has("roles:assign")) return fail(res, 403, "FORBIDDEN", "Gán vai trò khi tạo người dùng cần quyền roles:assign.");
    roles = await Role.find({ _id: { $in: roleIds } });
    if (roles.length !== roleIds.length) return fail(res, 400, "ROLE_NOT_FOUND", "Có vai trò không tồn tại trong roleIds.");
    const missing = missingPermissions(roles.flatMap((role) => role.permissions), req.permissions);
    if (missing.length) return fail(res, 403, "PRIVILEGE_ESCALATION", `Không thể gán vai trò có các quyền bạn không có: ${missing.join(", ")}.`);
  } else {
    roles = await Role.find({ code: "member" });
  }
  const normalizedEmail = body.email && String(body.email).trim().toLowerCase();
  if (normalizedEmail && await User.exists({ email: normalizedEmail })) return fail(res, 409, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng.");

  const user = await User.create({
    email: normalizedEmail,
    fullName: body.fullName,
    phone: body.phone ?? null,
    passwordHash: await bcrypt.hash(String(body.password), 10),
    roles: roles.map((role) => role._id),
  });
  await user.populate("roles");
  return res.status(201).location(`${req.baseUrl}/${user._id}`).json(userView(user));
});

router.get("/:userId", requirePermission("users:read"), loadUser, (req, res) => res.json(userView(req.target)));

router.patch("/:userId", requirePermission("users:update"), loadUser, async (req, res) => {
  const body = req.body || {};
  const details = notAllowedFields(body, ["fullName", "phone", "email", "status"]);
  if (body.status !== undefined && !["active", "locked"].includes(body.status)) details.push(detail("status", "INVALID_VALUE", "status phải là active hoặc locked."));
  if (details.length) return fail(res, 400, "VALIDATION_ERROR", "Dữ liệu đầu vào không hợp lệ.", details);
  if (body.status === "locked" && String(req.target._id) === String(req.user._id)) return fail(res, 403, "SELF_ACTION_FORBIDDEN", "Bạn không thể tự khóa tài khoản của mình.");
  if (body.status === "locked" && req.target.status === "active" && await isLastSuperAdmin(req.target)) return fail(res, 409, "LAST_SUPER_ADMIN", "Không thể khóa super-admin đang hoạt động cuối cùng.");

  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (await User.exists({ _id: { $ne: req.target._id }, email })) return fail(res, 409, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng.");
    body.email = email;
  }
  for (const key of ["fullName", "phone", "email", "status"]) if (key in body) req.target[key] = body[key];
  await req.target.save();
  return res.json(userView(req.target));
});

router.delete("/:userId", requirePermission("users:delete"), loadUser, async (req, res) => {
  if (String(req.target._id) === String(req.user._id)) return fail(res, 403, "SELF_ACTION_FORBIDDEN", "Bạn không thể tự xóa tài khoản của mình.");
  if (await isLastSuperAdmin(req.target)) return fail(res, 409, "LAST_SUPER_ADMIN", "Không thể xóa super-admin đang hoạt động cuối cùng.");
  req.target.status = "deleted";
  await req.target.save();
  return res.status(204).end();
});

router.get("/:userId/roles", requirePermission("users:read"), loadUser, (req, res) => {
  const data = req.target.roles.map(roleSummary);
  return res.json({ data, meta: { totalItems: data.length } });
});

router.put("/:userId/roles/:roleId", requirePermission("roles:assign"), loadUser, loadRole, async (req, res) => {
  const missing = missingPermissions(req.role.permissions, req.permissions);
  if (missing.length) return fail(res, 403, "PRIVILEGE_ESCALATION", `Không thể gán vai trò '${req.role.code}' vì bạn không có quyền: ${missing.join(", ")}.`);
  await User.updateOne({ _id: req.target._id }, { $addToSet: { roles: req.role._id } });
  return res.status(204).end();
});

router.delete("/:userId/roles/:roleId", requirePermission("roles:assign"), loadUser, loadRole, async (req, res) => {
  if (String(req.target._id) === String(req.user._id)) return fail(res, 403, "SELF_ACTION_FORBIDDEN", "Bạn không thể tự gỡ vai trò của mình.");
  const missing = missingPermissions(req.role.permissions, req.permissions);
  if (missing.length) return fail(res, 403, "PRIVILEGE_ESCALATION", `Không thể gỡ vai trò '${req.role.code}' vì bạn không có quyền: ${missing.join(", ")}.`);
  const assigned = req.target.roles.some((role) => String(role._id) === String(req.role._id));
  if (assigned && req.role.code === "super-admin" && await isLastSuperAdmin(req.target)) return fail(res, 409, "LAST_SUPER_ADMIN", "Không thể gỡ vai trò của super-admin đang hoạt động cuối cùng.");
  await User.updateOne({ _id: req.target._id }, { $pull: { roles: req.role._id } });
  return res.status(204).end();
});

module.exports = router;
