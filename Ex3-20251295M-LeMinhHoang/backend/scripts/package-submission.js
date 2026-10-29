const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const JSZip = require("jszip");

async function main() {
  const root = path.resolve(__dirname, "../..");
  const zip = new JSZip();
  const included = [];
  const allowed = /\.(?:js|json|html|css|md|yaml|txt|pdf|docx|png)$/i;
  function visit(folder) {
    for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
      if (["node_modules", ".runtime", ".git", "coverage"].includes(item.name)) continue;
      const full = path.join(folder,item.name);
      if (item.isDirectory()) { visit(full); continue; }
      if (item.name !== ".env.example" && (!allowed.test(item.name) || item.name.startsWith(".env"))) continue;
      const relative = path.relative(root,full).replace(/\\/g,"/");
      zip.file(`Ex3-20251295M-LeMinhHoang/${relative}`, fs.readFileSync(full));
      included.push(relative);
    }
  }
  visit(root);
  const buffer = await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}});
  const filename = "Ex3-20251295M-LeMinhHoang-Local.zip";
  fs.writeFileSync(path.join(root,filename),buffer);
  console.log(JSON.stringify({filename, files:included.length, bytes:buffer.length,sha256:crypto.createHash("sha256").update(buffer).digest("hex"),excluded:["node_modules",".env",".runtime","coverage"],status:"LOCAL; online requirements remain documented in report"},null,2));
}
main().catch((error)=>{console.error(error);process.exitCode=1});
