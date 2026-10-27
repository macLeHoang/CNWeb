const fs = require("node:fs");
const path = require("node:path");
const parser = require("@babel/parser");

const file = path.resolve(__dirname, "../../frontend/index.html");
const html = fs.readFileSync(file, "utf8");
const marker = '<script type="text/babel">';
const start = html.indexOf(marker);
const end = html.indexOf("</script>", start + marker.length);
if (start < 0 || end < 0) throw new Error("Không tìm thấy script JSX trong frontend/index.html.");
parser.parse(html.slice(start + marker.length, end), { sourceType: "script", plugins: ["jsx"] });
console.log("Frontend JSX syntax valid.");
