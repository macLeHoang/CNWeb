const express = require("express");
const Permission = require("../models/Permission");
const { authenticate, requirePermission } = require("../middleware/auth");
const { fail, detail, unknownQueryFields } = require("../utils/http");

const router = express.Router();
router.use(authenticate);

router.get("/", requirePermission("permissions:read"), async (req, res) => {
  const details = unknownQueryFields(req.query, ["resource"]);
  if (req.query.resource !== undefined && !/^[a-z][a-z0-9-]*$/.test(String(req.query.resource))) {
    details.push(detail("resource", "INVALID_VALUE", "resource không hợp lệ."));
  }
  if (details.length) return fail(res, 400, "INVALID_QUERY_PARAMETER", "Tham số truy vấn không hợp lệ.", details);
  const filter = req.query.resource ? { resource: req.query.resource } : {};
  const data = await Permission.find(filter).sort({ resource: 1, code: 1 }).select("-_id code resource action description").lean();
  return res.json({ data, meta: { totalItems: data.length } });
});

module.exports = router;
