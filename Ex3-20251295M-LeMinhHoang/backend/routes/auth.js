const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");
const { fail, detail, notAllowedFields, userView } = require("../utils/http");

const router = express.Router();

router.post("/auth/tokens", async (req, res) => {
  const body = req.body || {};
  const details = notAllowedFields(body, ["grantType", "email", "password"]);
  if (body.grantType !== "password") details.push(detail("grantType", "UNSUPPORTED", "grantType phải là 'password'."));
  if (!body.email) details.push(detail("email", "REQUIRED", "Thiếu email."));
  if (!body.password) details.push(detail("password", "REQUIRED", "Thiếu mật khẩu."));
  if (details.length) return fail(res, 400, "VALIDATION_ERROR", "Dữ liệu đầu vào không hợp lệ.", details);

  const user = await User.findOne({ email: String(body.email).trim().toLowerCase(), status: { $ne: "deleted" } })
    .select("+passwordHash");
  const valid = user && await bcrypt.compare(String(body.password), user.passwordHash);
  if (!valid) return fail(res, 401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
  if (user.status === "locked") return fail(res, 403, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa.");

  user.lastLoginAt = new Date();
  await user.save();
  const expiresIn = Number(process.env.ACCESS_TOKEN_TTL || 3600);
  const accessToken = jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn });
  res.set("Cache-Control", "no-store");
  return res.json({ tokenType: "Bearer", accessToken, expiresIn });
});

router.get("/me", authenticate, (req, res) =>
  res.json({ ...userView(req.user), permissions: [...req.permissions].sort() }));

module.exports = router;
