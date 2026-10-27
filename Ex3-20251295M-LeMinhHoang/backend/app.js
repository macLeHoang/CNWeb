const express = require("express");
const cors = require("cors");
const { fail, detail } = require("./utils/http");

function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
    exposedHeaders: ["Location"],
  }));
  app.use(express.json({ limit: "100kb" }));

  app.use("/api/v1", require("./routes/auth"));
  app.use("/api/v1/users", require("./routes/users"));
  app.use("/api/v1/roles", require("./routes/roles"));
  app.use("/api/v1/permissions", require("./routes/permissions"));

  app.use((req, res) => fail(res, 404, "ENDPOINT_NOT_FOUND", `Không có endpoint ${req.method} ${req.path}.`));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === "entity.parse.failed") return fail(res, 400, "MALFORMED_JSON", "Body không phải JSON hợp lệ.");
    if (error.name === "ValidationError") {
      const details = Object.values(error.errors).map((item) =>
        detail(item.path, item.kind === "required" ? "REQUIRED" : "INVALID_VALUE", item.message));
      return fail(res, 400, "VALIDATION_ERROR", "Dữ liệu đầu vào không hợp lệ.", details);
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || error.keyValue || {})[0];
      if (field === "email") return fail(res, 409, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng.");
      if (field === "code") return fail(res, 409, "ROLE_CODE_EXISTS", "Mã vai trò đã tồn tại.");
      return fail(res, 409, "CONFLICT", "Dữ liệu bị trùng.");
    }
    console.error(error);
    return fail(res, 500, "INTERNAL_ERROR", "Đã có lỗi phía server. Vui lòng thử lại sau.");
  });
  return app;
}

module.exports = createApp;
