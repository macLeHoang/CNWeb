const express = require("express");
const Role = require("../models/Role");
const User = require("../models/User");
const Permission = require("../models/Permission");
const { authenticate, requirePermission } = require("../middleware/auth");
const { missingPermissions } = require("../utils/rbac");
const {
  fail, detail, notAllowedFields, unknownQueryFields, isObjectId, parsePaging,
  parseSort, escapeRegex, pageMeta, roleView,
} = require("../utils/http");

const router = express.Router();
router.use(authenticate);

async function loadRole(req, res, next) {
  const role = isObjectId(req.params.roleId) ? await Role.findById(req.params.roleId) : null;
  if (!role) return fail(res, 404, "ROLE_NOT_FOUND", "Không tìm thấy vai trò.");
  req.role = role;
  return next();
}

const countUsers = (roleId) => User.countDocuments({ roles: roleId, status: { $ne: "deleted" } });

async function validatePermissionList(value) {
  if (!Array.isArray(value) || !value.every((code) => typeof code === "string")) {
    return { code: "VALIDATION_ERROR", message: "Dữ liệu đầu vào không hợp lệ.", details: [detail("permissions", "INVALID_TYPE", "permissions phải là mảng mã quyền.")] };
  }
  const unique = [...new Set(value)];
  const known = new Set((await Permission.find({ code: { $in: unique } })).map((item) => item.code));
  const unknown = unique.filter((code) => !known.has(code));
  if (unknown.length) {
    return { code: "PERMISSION_NOT_FOUND", message: "Danh sách chứa quyền không tồn tại.", details: unknown.map((code) => detail("permissions", "NOT_FOUND", `Quyền '${code}' không tồn tại.`)) };
  }
  return { permissions: unique };
}

router.get("/", requirePermission("roles:read"), async (req, res) => {
  const details = unknownQueryFields(req.query, ["q", "page", "limit", "sort"]);
  const { page, limit } = parsePaging(req.query, details);
  const sort = parseSort(req.query.sort || "name", ["name", "code", "createdAt"], details);
  const keyword = req.query.q === undefined ? "" : String(req.query.q).trim();
  if (req.query.q !== undefined && keyword.length < 2) details.push(detail("q", "TOO_SHORT", "q phải có ít nhất 2 ký tự."));
  if (details.length) return fail(res, 400, "INVALID_QUERY_PARAMETER", "Tham số truy vấn không hợp lệ.", details);
  const filter = keyword ? { $or: [{ name: { $regex: escapeRegex(keyword), $options: "i" } }, { code: { $regex: escapeRegex(keyword), $options: "i" } }] } : {};
  const [roles, totalItems] = await Promise.all([
    Role.find(filter).sort({ ...sort, _id: 1 }).skip((page - 1) * limit).limit(limit),
    Role.countDocuments(filter),
  ]);
  const counts = await Promise.all(roles.map((role) => countUsers(role._id)));
  return res.json({ data: roles.map((role, index) => roleView(role, counts[index])), meta: pageMeta(page, limit, totalItems) });
});

router.post("/", requirePermission("roles:create"), async (req, res) => {
  const body = req.body || {};
  const details = notAllowedFields(body, ["code", "name", "description", "permissions"]);
  if (details.length) return fail(res, 400, "VALIDATION_ERROR", "Dữ liệu đầu vào không hợp lệ.", details);
  const checked = await validatePermissionList(body.permissions ?? []);
  if (checked.code) return fail(res, 400, checked.code, checked.message, checked.details);
  const missing = missingPermissions(checked.permissions, req.permissions);
  if (missing.length) return fail(res, 403, "PRIVILEGE_ESCALATION", `Bạn không thể cấp các quyền mình không có: ${missing.join(", ")}.`);
  if (body.code && await Role.exists({ code: String(body.code).trim() })) return fail(res, 409, "ROLE_CODE_EXISTS", "Mã vai trò đã tồn tại.");
  const role = await Role.create({ code: body.code, name: body.name, description: body.description ?? null, permissions: checked.permissions });
  return res.status(201).location(`${req.baseUrl}/${role._id}`).json(roleView(role, 0));
});

router.get("/:roleId", requirePermission("roles:read"), loadRole, async (req, res) =>
  res.json(roleView(req.role, await countUsers(req.role._id))));

router.patch("/:roleId", requirePermission("roles:update"), loadRole, async (req, res) => {
  const body = req.body || {};
  const details = notAllowedFields(body, ["name", "description"]);
  if (details.length) return fail(res, 400, "VALIDATION_ERROR", "Dữ liệu đầu vào không hợp lệ.", details);
  for (const key of ["name", "description"]) if (key in body) req.role[key] = body[key];
  await req.role.save();
  return res.json(roleView(req.role, await countUsers(req.role._id)));
});

router.delete("/:roleId", requirePermission("roles:delete"), loadRole, async (req, res) => {
  if (req.role.isSystem) return fail(res, 409, "SYSTEM_ROLE_PROTECTED", "Không thể xóa vai trò hệ thống.");
  if (await countUsers(req.role._id)) return fail(res, 409, "ROLE_IN_USE", "Không thể xóa vai trò đang được gán cho người dùng.");
  await req.role.deleteOne();
  return res.status(204).end();
});

router.get("/:roleId/permissions", requirePermission("roles:read"), loadRole, async (req, res) => {
  const data = await Permission.find({ code: { $in: req.role.permissions } }).sort({ resource: 1, code: 1 }).select("-_id code resource action description").lean();
  return res.json({ data, meta: { totalItems: data.length } });
});

router.put("/:roleId/permissions", requirePermission("roles:update"), loadRole, async (req, res) => {
  const details = notAllowedFields(req.body || {}, ["permissions"]);
  if (details.length) return fail(res, 400, "VALIDATION_ERROR", "Dữ liệu đầu vào không hợp lệ.", details);
  if (req.role.isSystem) return fail(res, 409, "SYSTEM_ROLE_PROTECTED", "Không thể thay đổi quyền của vai trò hệ thống.");
  const checked = await validatePermissionList(req.body?.permissions);
  if (checked.code) return fail(res, 400, checked.code, checked.message, checked.details);
  const before = new Set(req.role.permissions);
  const after = new Set(checked.permissions);
  const changed = [...new Set([...before, ...after])].filter((code) => before.has(code) !== after.has(code));
  const missing = missingPermissions(changed, req.permissions);
  if (missing.length) return fail(res, 403, "PRIVILEGE_ESCALATION", `Bạn không thể thay đổi các quyền mình không có: ${missing.join(", ")}.`);
  req.role.permissions = checked.permissions;
  await req.role.save();
  return res.json(roleView(req.role, await countUsers(req.role._id)));
});

module.exports = router;
