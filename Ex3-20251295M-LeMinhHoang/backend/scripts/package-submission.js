const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const JSZip = require("jszip");

async function main() {
  const root = path.resolve(__dirname, "../..");
  const zip = new JSZip();
  const included = [];
  const allowed = /\.(?:js|json|html|css|md|yaml|txt|pdf|docx|png|ps1)$/i;
  function visit(folder) {
    for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
      if (["node_modules", ".runtime", ".git", "coverage"].includes(item.name)) continue;
      const full = path.join(folder,item.name);
      if (item.isDirectory()) { visit(full); continue; }
      if (item.name !== ".env.example" && (!allowed.test(item.name) || item.name.startsWith(".env"))) continue;
      const relative = path.relative(root,full).replace(/\\/g,"/");
      if (relative === "evidence/submission-manifest.json") continue;
      zip.file(`Ex3-20251295M-LeMinhHoang/${relative}`, fs.readFileSync(full));
      included.push(relative);
    }
  }
  visit(root);
  const workflowPath = path.resolve(root, "../.github/workflows/ex3-rbac.yml");
  if (fs.existsSync(workflowPath)) {
    zip.file(".github/workflows/ex3-rbac.yml", fs.readFileSync(workflowPath));
    included.push(".github/workflows/ex3-rbac.yml");
  }
  const buffer = await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}});
  const publicationFile = path.join(root, "evidence/publication-results.json");
  const online = fs.existsSync(publicationFile) && JSON.parse(fs.readFileSync(publicationFile, "utf8")).backendVerified === true;
  const filename = `Ex3-20251295M-LeMinhHoang-${online ? "Submission" : "Local"}.zip`;
  fs.writeFileSync(path.join(root,filename),buffer);
  const manifest = {filename, files:included.length, bytes:buffer.length,sha256:crypto.createHash("sha256").update(buffer).digest("hex"),excluded:["node_modules",".env",".runtime","coverage"],status:online ? "ONLINE verified; remaining report requirements are documented honestly" : "LOCAL; online requirements remain documented in report"};
  fs.writeFileSync(path.join(root, "evidence/submission-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest,null,2));
}
main().catch((error)=>{console.error(error);process.exitCode=1});
