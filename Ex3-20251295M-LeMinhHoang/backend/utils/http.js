const mongoose = require("mongoose");

function fail(res, status, code, message, details) {
  const error = { code, message };
  if (details?.length) error.details = details;
  return res.status(status).json({ error });
}

const detail = (field, issue, message) => ({ field, issue, message });

function notAllowedFields(body, allowed) {
  return Object.keys(body || {})
    .filter((key) => !allowed.includes(key))
    .map((key) => detail(key, "FIELD_NOT_ALLOWED", `Trường '${key}' không được phép gửi lên endpoint này.`));
}

function unknownQueryFields(query, allowed) {
  return Object.keys(query || {})
    .filter((key) => !allowed.includes(key))
    .map((key) => detail(key, "FIELD_NOT_ALLOWED", `Tham số '${key}' không được hỗ trợ.`));
}

const isObjectId = (id) =>
  mongoose.isValidObjectId(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

function parsePaging(query, details) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) details.push(detail("page", "INVALID_VALUE", "page phải là số nguyên ≥ 1."));
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) details.push(detail("limit", "OUT_OF_RANGE", "limit phải trong khoảng 1–100."));
  return { page, limit };
}

function parseSort(raw, allowed, details) {
  const sort = {};
  for (const part of String(raw).split(",").map((value) => value.trim()).filter(Boolean)) {
    const field = part.replace(/^-/, "");
    if (!allowed.includes(field)) {
      details.push(detail("sort", "FIELD_NOT_SORTABLE", `Không thể sắp xếp theo '${field}'.`));
    } else {
      sort[field] = part.startsWith("-") ? -1 : 1;
    }
  }
  return sort;
}

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pageMeta = (page, limit, totalItems) => ({ page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)) });
const roleSummary = (role) => ({ id: String(role._id), code: role.code, name: role.name });

function userView(user) {
  return {
    id: String(user._id),
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    status: user.status,
    roles: (user.roles || []).filter((role) => role?.code).map(roleSummary),
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function roleView(role, userCount = 0) {
  return {
    id: String(role._id),
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: [...role.permissions],
    userCount,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

module.exports = {
  fail, detail, notAllowedFields, unknownQueryFields, isObjectId, parsePaging,
  parseSort, escapeRegex, pageMeta, roleSummary, userView, roleView,
};
