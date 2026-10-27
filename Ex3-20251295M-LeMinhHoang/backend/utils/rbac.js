const Role = require("../models/Role");
const User = require("../models/User");

const missingPermissions = (codes, myPermissions) =>
  [...new Set(codes)].filter((code) => !myPermissions.has(code));

async function isLastSuperAdmin(user) {
  const role = await Role.findOne({ code: "super-admin" });
  if (!role || !user.roles.some((item) => String(item._id || item) === String(role._id))) return false;
  const others = await User.countDocuments({ _id: { $ne: user._id }, status: "active", roles: role._id });
  return others === 0;
}

module.exports = { missingPermissions, isLastSuperAdmin };
