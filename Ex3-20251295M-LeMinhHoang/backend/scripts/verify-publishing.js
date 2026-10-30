const fs = require("node:fs");
const path = require("node:path");

const folder = path.resolve(__dirname, "../../evidence");
const repository = "https://github.com/macLeHoang/CNWeb";
const api = "https://api.github.com/repos/macLeHoang/CNWeb";
const frontendUrl = "https://maclehoang.github.io/CNWeb/Ex3-20251295M-LeMinhHoang/frontend/";

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
  const result = {
    checkedAt: new Date().toISOString(),
    repository: { url: repository, branch: "main", commit: branch.commit.sha, pushed: true },
    workflows,
    frontend: { url: frontendUrl, status: frontend.status, apiBase, staticPublished: true, apiStillLocal: /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(apiBase || "") },
    backendVerified: false,
    note: "Public GitHub and Pages checked directly. No Render/Atlas account access; no online backend is claimed.",
  };
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "publication-results.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
