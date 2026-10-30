const fs = require("node:fs");
const path = require("node:path");

const folder = path.resolve(__dirname, "../../evidence");
const repository = "https://github.com/macLeHoang/CNWeb";
const api = "https://api.github.com/repos/macLeHoang/CNWeb";
const frontendUrl = "https://maclehoang.github.io/CNWeb/Ex3-20251295M-LeMinhHoang/frontend/";
require("dotenv").config({ quiet: true });

async function get(url) {
  const response = await fetch(url, { headers: { "User-Agent": "CNWeb-RBAC-verification" }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}

async function main() {
  const [branch, runs, frontend] = await Promise.all([
    (async () => (await get(`${api}/branches/main`)).json())(),
    (async () => (await get(`${api}/actions/runs?per_page=10`)).json())(),
    get(frontendUrl),
  ]);
  const html = await frontend.text();
  const apiBase = html.match(/const API_BASE\s*=\s*"([^"]+)"/)?.[1] || null;
  const workflows = runs.workflow_runs.filter((run) => run.head_sha === branch.commit.sha)
    .map((run) => ({ name: run.name, status: run.status, conclusion: run.conclusion, commit: run.head_sha, url: run.html_url }));
  const expectedApi = process.env.VERIFY_API_BASE?.replace(/\/$/, "");
  let backend = null;
  if (expectedApi) {
    const response = await fetch(`${expectedApi}/me`, { signal: AbortSignal.timeout(90000) });
    const body = await response.json();
    backend = { apiBase: expectedApi, checkedAt: new Date().toISOString(), unauthenticatedStatus: response.status, errorCode: body.error?.code, reachable: response.status === 401 && body.error?.code === "UNAUTHENTICATED" };
  }
  const onlinePath = path.join(folder, "online/postman-results.json");
  const online = fs.existsSync(onlinePath) ? JSON.parse(fs.readFileSync(onlinePath, "utf8")) : null;
  const result = {
    checkedAt: new Date().toISOString(),
    repository: { url: repository, branch: "main", commit: branch.commit.sha, pushed: true },
    workflows,
    frontend: { url: frontendUrl, status: frontend.status, apiBase, staticPublished: true, apiStillLocal: /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(apiBase || "") },
    backend,
    backendVerified: Boolean(backend?.reachable && apiBase === expectedApi && online?.baseUrl === expectedApi && online?.assertions?.total > 0 && online?.failures?.length === 0),
    note: "GitHub and Pages checked directly. Backend reachability and authenticated collection results are recorded separately; workflow status is reported as returned, not assumed successful.",
  };
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "publication-results.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
