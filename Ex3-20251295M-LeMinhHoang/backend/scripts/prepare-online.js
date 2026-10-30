const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { seedDatabase } = require("../seed");

const backend = path.resolve(__dirname, "..");
const runtime = path.join(backend, ".runtime");
const privateEnv = path.join(runtime, "online.env");
dotenv.config({ path: path.join(backend, ".env"), quiet: true });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<") || !uri.startsWith("mongodb+srv://")) throw new Error("MONGODB_URI is missing or still a placeholder in backend/.env.");
  const parsed = new URL(uri);
  if (parsed.hostname !== "rbac-cluster.g2ld9sk.mongodb.net" || parsed.pathname !== "/it4409_rbac") throw new Error("Expected the existing rbac-cluster and database it4409_rbac; URI value is not printed.");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const counts = {};
  for (const name of ["users", "roles", "permissions"]) counts[name] = await mongoose.connection.db.collection(name).countDocuments();
  const existing = Object.values(counts).some((count) => count > 0);
  if (process.argv.includes("--check")) {
    console.log(JSON.stringify({ connected: true, database: parsed.pathname.slice(1), counts, empty: !existing }));
    return;
  }
  if (existing) throw new Error("Existing RBAC records found. No reset or password changes performed; provide existing verification credentials to continue.");
  fs.mkdirSync(runtime, { recursive: true });
  if (!fs.existsSync(privateEnv)) {
    const secret = () => `A9!${crypto.randomBytes(21).toString("base64url")}`;
    const values = {
      JWT_SECRET: crypto.randomBytes(48).toString("base64url"),
      STUDENT_EMAIL: "20251295m@example.test",
      STUDENT_PASSWORD: secret(), SEED_DEFAULT_PASSWORD: secret(),
      ...Object.fromEntries(["ADMIN", "MANAGER", "AUDITOR", "MEMBER"].map((key) => [`GRADER_${key}_PASSWORD`, secret()])),
    };
    fs.writeFileSync(privateEnv, Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
  }
  const credentials = dotenv.parse(fs.readFileSync(privateEnv));
  const seeded = await seedDatabase({ ...process.env, ...credentials });
  const access = ["# Thông tin truy cập riêng – không commit hoặc công khai", "", "Dữ liệu giả lập. Chuyển riêng bốn tài khoản giảng viên khi nộp bài.", "", "| Tài khoản | Email | Mật khẩu |", "|---|---|---|", `| Chủ bài | ${credentials.STUDENT_EMAIL} | ${credentials.STUDENT_PASSWORD} |`, ...["admin", "manager", "auditor", "member"].map((key) => `| ${key} | gv.${key}.20251295@example.test | ${credentials[`GRADER_${key.toUpperCase()}_PASSWORD`]} |`), "", "Backend/Frontend: xem evidence/publication-results.json.", "Các secret database/JWT không nằm trong tài liệu này."];
  fs.writeFileSync(path.join(runtime, "grader-access.md"), access.join("\n") + "\n", { mode: 0o600 });
  const result = { at: new Date().toISOString(), database: "it4409_rbac", before: counts, seeded, reset: false, credentialsPublic: false };
  fs.writeFileSync(path.resolve(backend, "../evidence/atlas-seed-results.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}

main().catch(() => {
  // Driver errors can embed connection information. Keep diagnostics deliberately bounded.
  console.error("Atlas preparation did not complete. Check URI, database counts and IP access list; no reset is performed. Use --check for a read-only inventory.");
  process.exitCode = 1;
}).finally(async () => { await mongoose.disconnect(); });
