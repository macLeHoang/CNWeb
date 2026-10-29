const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const newman = require("newman");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "../..");
const evidence = path.join(root, "evidence");
const base = "http://127.0.0.1:3001/api/v1";
const password = "Demo@2026";
fs.mkdirSync(evidence, { recursive: true });
const write = (name, data) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(data, null, 2));

async function runCollection() {
  const collection = JSON.parse(fs.readFileSync(path.join(root, "postman/Ex3-RBAC-T01-T24.postman_collection.json"), "utf8"));
  for (const variable of collection.variable) {
    if (variable.key.endsWith("Password")) variable.value = password;
    if (variable.key === "baseUrl") variable.value = base;
    if (variable.key === "runEmail") variable.value = "";
  }
  const summary = await new Promise((resolve, reject) => newman.run({ collection, reporters: [] }, (error, result) => error ? reject(error) : resolve(result)));
  const result = {
    at: new Date().toISOString(), environment: "LOCAL / synthetic data", baseUrl: base,
    requests: summary.run.stats.requests, assertions: summary.run.stats.assertions,
    failures: summary.run.failures.map((failure) => ({ source: failure.source?.name, message: failure.error?.message })),
    executions: summary.run.executions.map((execution) => {
      let body; try { body = JSON.parse(execution.response?.stream?.toString() || "{}"); } catch { body = {}; }
      return { name: execution.item.name, status: execution.response?.code, code: body.error?.code, issues: body.error?.details?.map((detail) => detail.issue), assertions: execution.assertions?.map((item) => ({ name: item.assertion, passed: !item.error })) };
    }),
  };
  write("postman-results.json", result);
  console.log(`Postman: ${result.assertions.total} assertions, ${result.failures.length} failures`);
  assert.equal(result.failures.length, 0, "Postman collection failed");
}

async function loginApi(email) {
  const response = await fetch(`${base}/auth/tokens`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grantType: "password", email, password }) });
  assert.equal(response.status, 200);
  return (await response.json()).accessToken;
}

async function runBrowser() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  const cases = [];
  const shot = async (name) => {
    await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
  };
  const login = async (email) => {
    await page.goto("http://127.0.0.1:5500/");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).waitFor();
  };
  try {
    await page.goto("http://127.0.0.1:5500/");
    await page.locator("#email").fill("20251295m@example.test");
    await page.locator("#password").fill("Wrong@2026");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.getByText("Email hoặc mật khẩu không đúng.", { exact: true }).waitFor();
    await shot("S03-local-login-error"); cases.push("Sai mật khẩu hiển thị lỗi 401");

    await login("20251295m@example.test");
    await page.getByRole("cell", { name: "Lê Minh Hoàng (bạn)", exact: true }).waitFor();
    await shot("S04-local-admin"); cases.push("Super-admin có đầy đủ tab và dòng của bản thân đầu tiên");
    await page.getByRole("button", { name: "+ Thêm người dùng", exact: true }).click();
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await page.getByText("Họ tên phải có ít nhất 2 ký tự.", { exact: true }).waitFor();
    await shot("S08a-local-validation");
    await page.locator("#user-email").fill("20251295m@example.test");
    await page.locator("#user-fullName").fill("Người dùng QA");
    await page.locator("#user-password").fill(password);
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await page.getByText("Email đã được sử dụng.", { exact: true }).waitFor();
    await shot("S08b-local-duplicate"); cases.push("Validation tại ô nhập và lỗi email trùng từ backend");
    await page.locator("#user-email").fill(`ui.${Date.now()}@example.test`);
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("cell", { name: "Người dùng QA", exact: true }).waitFor();
    let row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "Người dùng QA", exact: true }) });
    await row.getByRole("button", { name: "Sửa", exact: true }).click();
    await page.locator("#user-phone").fill("+84911222333");
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await row.getByRole("button", { name: "Khóa", exact: true }).click();
    await row.getByRole("button", { name: "Mở khóa", exact: true }).waitFor();
    await row.getByRole("button", { name: "Mở khóa", exact: true }).click();
    await row.getByRole("button", { name: "Khóa", exact: true }).waitFor();
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Xóa", exact: true }).click();
    await page.getByRole("cell", { name: "Người dùng QA", exact: true }).waitFor({ state: "hidden" });
    cases.push("Tạo/sửa/khóa/mở khóa/xóa người dùng và tải lại danh sách");
    await page.locator("#search").fill("nguyen");
    await page.waitForResponse((response) => response.url().includes("q=nguyen") && response.status() === 200);
    await shot("S07-local-search");
    await page.locator("#search").fill("");
    await page.getByRole("button", { name: "Vai trò", exact: true }).first().click();
    await page.getByRole("cell", { name: "tro-giang", exact: true }).waitFor();
    const customRow = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "tro-giang", exact: true }) });
    await customRow.getByRole("button", { name: "Sửa", exact: true }).click();
    await shot("S10-local-role");
    await page.getByRole("button", { name: "Hủy", exact: true }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await customRow.getByRole("button", { name: "Xóa", exact: true }).click();
    await page.getByText("Không thể xóa vai trò đang được gán cho người dùng.", { exact: true }).waitFor();
    await shot("S11-local-role-in-use"); cases.push("Vai trò tùy chỉnh, checkbox quyền và lỗi ROLE_IN_USE");
    await page.getByRole("button", { name: "+ Thêm vai trò", exact: true }).click();
    const roleCode = `ui-role-${Date.now()}`;
    await page.locator("#role-code").fill(roleCode);
    await page.locator("#role-name").fill("Vai trò UI QA");
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const uiRoleRow = page.getByRole("row").filter({ has: page.getByRole("cell", { name: roleCode, exact: true }) });
    await uiRoleRow.getByRole("button", { name: "Sửa", exact: true }).click();
    await page.locator("#role-name").fill("Vai trò UI đã sửa");
    await page.getByRole("dialog").getByText("users:read", { exact: true }).click();
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await uiRoleRow.getByText("users:read", { exact: true }).waitFor();
    page.once("dialog", (dialog) => dialog.accept());
    await uiRoleRow.getByRole("button", { name: "Xóa", exact: true }).click();
    await uiRoleRow.waitFor({ state: "hidden" });
    cases.push("Tạo/sửa tên/thay quyền/xóa vai trò bằng giao diện");

    await login("gv.manager.20251295@example.test");
    await page.getByRole("button", { name: "+ Thêm người dùng", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Xóa", exact: true }).count(), 0);
    await page.locator("#search").fill("gv.manager");
    await page.waitForResponse((response) => response.url().includes("q=gv.manager") && response.status() === 200);
    await page.getByRole("cell", { name: "Tài khoản kiểm tra user-manager (bạn)", exact: true }).waitFor();
    assert.ok(await page.getByRole("button", { name: "Khóa", exact: true }).isDisabled());
    await shot("S05-local-manager");
    await page.getByRole("button", { name: "Vai trò", exact: true }).nth(1).click();
    const disabled = page.getByRole("dialog").locator('input[type="checkbox"]:disabled');
    assert.ok(await disabled.count() > 0);
    await shot("S09-local-assign");
    await page.getByRole("button", { name: "Hủy", exact: true }).click();
    cases.push("User-manager không có nút xóa; vai trò vượt quyền bị vô hiệu");

    await login("gv.auditor.20251295@example.test");
    assert.equal(await page.getByRole("button", { name: "+ Thêm người dùng", exact: true }).count(), 0);
    assert.equal(await page.locator("nav").getByRole("button", { name: "Vai trò", exact: true }).count(), 0);
    await shot("auditor-local"); cases.push("Auditor thấy người dùng nhưng không có tạo, xóa hoặc tab vai trò");

    await login("gv.member.20251295@example.test");
    await page.getByRole("heading", { name: "Hồ sơ của tôi", exact: true }).waitFor();
    assert.equal(await page.locator("nav button").count(), 1);
    await shot("S06-local-member");
    const unauthorized = await page.evaluate(async () => {
      const token = sessionStorage.getItem("rbac_token");
      const response = await fetch("http://127.0.0.1:3001/api/v1/users", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: "hack@example.test", fullName: "Hack", password: "Hack@2026" }) });
      return { status: response.status, body: await response.json() };
    });
    assert.equal(unauthorized.status, 403); write("member-console-result.json", unauthorized);
    cases.push("Member chỉ có Hồ sơ; gọi fetch POST trực tiếp bị backend chặn 403");
    await page.setViewportSize({ width: 390, height: 844 });
    await login("20251295m@example.test");
    await shot("S14-local-mobile");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, "Mobile page must not overflow; table scrolls internally");
    cases.push("Mobile 390px: bảng cuộn bên trong, trang không tràn ngang");
    await page.evaluate(() => sessionStorage.removeItem("rbac_token"));
    await page.getByRole("button", { name: "Sau", exact: true }).click();
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).waitFor();
    cases.push("Xóa token rồi gọi API quay về đăng nhập");
    assert.deepEqual(failures, []);
  } finally {
    write("ui-results.json", { at: new Date().toISOString(), environment: "LOCAL / synthetic data", passed: cases, pageErrors: failures });
    await browser.close();
  }
}

async function measure() {
  const token = await loginApi("20251295m@example.test");
  const data = [];
  for (const limit of [10, 100]) {
    const start = performance.now();
    const response = await fetch(`${base}/users?page=1&limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.text();
    data.push({ at: new Date().toISOString(), url: `/users?page=1&limit=${limit}`, status: response.status, ms: +(performance.now() - start).toFixed(2), bytes: Buffer.byteLength(body) });
  }
  const preflight = await fetch(`${base}/users/abc`, { method: "OPTIONS", headers: { Origin: "http://127.0.0.1:5500", "Access-Control-Request-Method": "PATCH", "Access-Control-Request-Headers": "authorization,content-type" } });
  write("network-results.json", { environment: "LOCAL; measurements via Node fetch, not DevTools", measurements: data, preflight: { status: preflight.status, headers: Object.fromEntries([...preflight.headers].filter(([key]) => key.startsWith("access-control"))) }, authorizationExample: `Bearer ${token.slice(0,10)}… [redacted]` });
}

async function main() { await runCollection(); await runBrowser(); await measure(); console.log("Browser and network evidence collected."); }
main().catch((error) => { console.error(error); process.exitCode = 1; });
