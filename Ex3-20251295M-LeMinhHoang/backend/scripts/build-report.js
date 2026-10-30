const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright");
const JSZip = require("jszip");
const D = require("docx");

const root = path.resolve(__dirname, "../..");
const workspace = path.resolve(root, "..");
const evidence = path.join(root, "evidence");
const baseName = "Ex3-RBAC-20251295M-LeMinhHoang";
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (name) => JSON.parse(read(`evidence/${name}`));
const publication = fs.existsSync(path.join(evidence, "publication-results.json")) ? json("publication-results.json") : null;
const onlineVerified = publication?.backendVerified === true && fs.existsSync(path.join(evidence, "online/ui-results.json")) && json("online/ui-results.json").completed === true;
const environmentLabel = onlineVerified ? "ONLINE" : "LOCAL";
const deployment = fs.existsSync(path.join(evidence, "deployment-results.json")) ? json("deployment-results.json") : null;
const git = (...args) => execFileSync("git", ["-c", `safe.directory=${workspace.replace(/\\/g, "/")}`, ...args], { cwd: workspace, encoding: "utf8" }).trim();
const commit = publication?.repository?.commit || git("rev-parse", "HEAD");
const logs = git("log", "--format=%h|%ad|%s", "--date=short", "--", "Ex3-20251295M-LeMinhHoang").split("\n").filter(Boolean).map((line) => line.split("|"));
const backend = json("backend-results.json");
const postman = json(`${onlineVerified ? "online/" : ""}postman-results.json`);
const ui = json(`${onlineVerified ? "online/" : ""}ui-results.json`);
const network = json(`${onlineVerified ? "online/" : ""}network-results.json`);
const experiments = json("experiments.json");
const timestamp = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const pages = [];
let pdfPageMap = [];
let page;
const newPage = (title) => { page = { title, blocks: [] }; pages.push(page); if (title) h(title, 1); };
const p = (text) => page.blocks.push({ type: "p", text: String(text) });
const h = (text, level = 2) => page.blocks.push({ type: "h", text, level });
const table = (headers, rows) => page.blocks.push({ type: "table", headers, rows: rows.map((row) => row.map((cell) => String(cell ?? ""))) });
const code = (text) => page.blocks.push({ type: "code", text });
const pic = (filename, caption) => {
  if (onlineVerified) {
    filename = `online/${filename.replace("-local", "-online")}`;
    caption = caption.replaceAll("(local)", "(online)");
  }
  if (!fs.existsSync(path.join(evidence, filename))) throw new Error(`Missing evidence image: ${filename}`);
  page.blocks.push({ type: "image", filename, caption });
};
const ref = (file, search) => {
  const lines = read(file).split(/\r?\n/);
  const line = lines.findIndex((text) => text.includes(search)) + 1;
  if (!line) throw new Error(`Reference not found: ${file}: ${search}`);
  return `${file}:${line} — https://github.com/macLeHoang/CNWeb/blob/${commit}/Ex3-20251295M-LeMinhHoang/${file}#L${line}`;
};
const shortRef = (file, search) => ref(file, search).split(" — ")[0];

async function templateQuestions() {
  const zip = await JSZip.loadAsync(fs.readFileSync(path.join(root, "Ex3-RBAC-MaSV-HoTenSV.docx")));
  const xml = await zip.file("word/document.xml").async("string");
  const decode = (text) => text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map(([item]) => [...item.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => decode(match[1])).join(""));
  const questions = [];
  for (let number = 1; number <= 10; number++) {
    const start = paragraphs.findLastIndex((text) => text.startsWith(`Câu ${number}. `));
    const end = paragraphs.findIndex((text, index) => index > start && (text.startsWith(`Câu ${number + 1}. `) || text === "9. Khai báo sử dụng AI"));
    const texts = paragraphs.slice(start, end < 0 ? undefined : end).filter((text) => text && !text.includes("DÁN ẢNH") && !text.startsWith("Hình S") && !text.startsWith("[") && !["Trả lời:", "Thứ tự", "Hàm / middleware", "Vị trí (file:dòng)", "Việc nó làm với request này", "Hạng mục", "Nội dung", "1", "2", "3", "…"].includes(text));
    questions.push({ title: texts[0], prompts: texts.slice(1) });
  }
  return questions;
}

function populate(questions) {
  newPage("");
  h("ĐẠI HỌC BÁCH KHOA HÀ NỘI", 1);
  p("TRƯỜNG CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG");
  h("BÁO CÁO CÁ NHÂN", 1);
  h("BÀI TẬP FULLSTACK – QUẢN LÝ NGƯỜI DÙNG VÀ PHÂN QUYỀN RBAC", 1);
  p("Học phần: Công nghệ Web và Dịch vụ trực tuyến (IT4409)");
  table(["Thông tin", "Nội dung"], [
    ["Họ và tên", "Lê Minh Hoàng"], ["MSSV", "20251295M"],
    ["Lớp / Mã lớp học", "IT4409-1-26 (26.1A01)"],
    ["Email sinh viên", "hoang.lm251295M@sis.hust.edu.vn (do sinh viên cung cấp)."],
    ["Nhóm BTL", "Không có nhóm BTL. Các bạn học trong seed là giả lập."],
    ["Giảng viên", "ThS. Nguyễn Mạnh Tuấn"], ["Thời điểm tạo báo cáo", timestamp],
  ]);
  h(`Bản ${environmentLabel.toLowerCase()} với dữ liệu giả lập`, 2);
  p(onlineVerified ? "Báo cáo được AI tổng hợp từ mã nguồn, kiểm thử API online và ảnh viewport Chrome của GitHub Pages gọi backend Render kết nối MongoDB Atlas. Các trạng thái triển khai lấy từ plugin chính thức; kết quả Newman và browser lưu dưới evidence/online. Ảnh viewport không chứa thanh địa chỉ hoặc giao diện DevTools; JSON không được coi là ảnh dashboard. Mục 8 giữ dữ kiện kỹ thuật và các phần sinh viên cần tự xác nhận." : "Báo cáo được AI tổng hợp từ mã nguồn, kết quả kiểm thử và ảnh chụp thực tế ở localhost. Backend online chưa được xác minh đầy đủ. Mục 8 ghi dữ kiện kỹ thuật để sinh viên tự phân tích.");

  newPage("MỤC LỤC");
  p("Giữ cấu trúc mục 1–10 và các câu hỏi của template. Số trang dưới đây là các trang nội dung của bản PDF được tạo cùng báo cáo.");
  page.blocks.push({ type: "toc" });
  p("Quy ước bằng chứng: hậu tố local/online chỉ môi trường thực của ảnh viewport Chrome; ảnh không có thanh địa chỉ/DevTools. Mỗi ảnh online có metadata URL, thời điểm và viewport. JSON từ plugin hoặc CDP là dữ liệu công cụ, không phải ảnh dashboard. Bằng chứng local của thí nghiệm phá code được giữ nhãn local.");

  newPage("1. Thông tin nộp bài");
  h("1.1. Đường dẫn");
  table(["Hạng mục", "Địa chỉ / trạng thái"], [
    ["Repository", "https://github.com/macLeHoang/CNWeb — đã push và xác minh bằng API GitHub."],
    ["Commit mã nguồn đối chiếu", commit],
    ["Frontend local", "http://127.0.0.1:5500/"], ["Backend local", "http://127.0.0.1:3001/api/v1"],
    ["Frontend online", publication?.frontend?.url || "Chưa được xác minh"],
    ["Backend online", onlineVerified ? publication.backend.apiBase : "Chưa xác minh đầy đủ; xem evidence/publication-results.json"],
    ["Postman", "postman/Ex3-RBAC-T01-T24.postman_collection.json"], ["Video demo", "Không thực hiện (không bắt buộc)."],
  ]);
  h("1.2. Tài khoản để giảng viên kiểm tra trên bản online");
  p(onlineVerified ? "Bốn tài khoản dưới đây đã được kiểm thử trên bản online. Mật khẩu riêng được lưu trong backend/.runtime/grader-access.md để chủ bài chuyển riêng cho giảng viên; không đưa vào Git hoặc báo cáo công khai. Các mật khẩu demo local không dùng trên Atlas." : "Bốn tài khoản dưới đây đang sử dụng trên LOCAL với mật khẩu demo công khai.");
  table(["Vai trò", "Email demo", "Mật khẩu demo"], [
    ["super-admin", "gv.admin.20251295@example.test", onlineVerified ? "Cấp riêng" : "Demo@2026"], ["user-manager", "gv.manager.20251295@example.test", onlineVerified ? "Cấp riêng" : "Demo@2026"],
    ["auditor", "gv.auditor.20251295@example.test", onlineVerified ? "Cấp riêng" : "Demo@2026"], ["member", "gv.member.20251295@example.test", onlineVerified ? "Cấp riêng" : "Demo@2026"],
  ]);
  h("1.3. Môi trường");
  const pkg = JSON.parse(read("backend/package.json"));
  table(["Thành phần", "Phiên bản / cách chạy"], [["Node.js (máy tạo báo cáo)", process.version], ["Express / Mongoose", `${pkg.dependencies.express} / ${pkg.dependencies.mongoose}; phiên bản khóa trong package-lock.json`], ["Database", onlineVerified ? "Atlas Free, rbac-cluster, AWS Singapore; database it4409_rbac" : "MongoDB local qua mongodb-memory-server"], ["Frontend", "React 18 CDN, Axios CDN, Babel; GitHub Pages"], ["Backend", onlineVerified ? `Render Free Singapore; ${publication.backend.apiBase}` : "Express local port 3001; online chưa xác minh"]]);

  newPage("2. Tổng quan kết quả");
  h("2.1. Bảng hoàn thành chức năng");
  const functions = ["Đăng nhập POST /auth/tokens, GET /me", "Middleware authenticate và requirePermission", "GET /users tìm kiếm/lọc/sort/phân trang", "POST /users, allow-list, mật khẩu mạnh", "PATCH /users và khóa/mở khóa", "DELETE /users xóa mềm", "Gán/gỡ vai trò idempotent, chống leo thang", "CRUD vai trò, thay quyền, bảo vệ role", "Danh mục quyền và quyền của vai trò", "Response/mã lỗi thống nhất", "Frontend đăng nhập và interceptor", "Hiển thị theo quyền", "Trang Người dùng và các modal", "Trang Vai trò và modal", "Responsive dưới 768px", "Triển khai online", "Phần mở rộng", "Dữ liệu người thật trong seed"];
  table(["#", "Chức năng", "Trạng thái"], functions.map((text, index) => [index + 1, text, index < 15 ? `Đã kiểm tra ${environmentLabel.toLowerCase()}` : index === 16 ? "Không làm, ngoài phạm vi đã chốt" : index === 17 ? "Giả lập theo yêu cầu; chưa đạt tiêu chí dữ liệu thật" : onlineVerified ? "Đã xác minh online" : "Chưa xác minh"]));
  h("2.2. Tóm tắt (5–8 câu)");
  p(`Ứng dụng có 18 endpoint REST và frontend React cho quản lý người dùng, vai trò và hồ sơ cá nhân. Quyền được hợp từ các vai trò và đọc lại trong từng request. Backend đạt ${backend.total} test tự động ở môi trường kiểm thử riêng; Newman ${environmentLabel} đạt ${postman.assertions.total} assertion. Chrome ${environmentLabel} hoàn thành ${ui.passed.length} kịch bản giao diện, gồm bốn role và mobile. Seed ban đầu có 25 tài khoản giả lập với miền example.test; kiểm thử có thể tạo thêm tài khoản tạm đã xóa mềm. ${onlineVerified ? "GitHub Pages gọi backend Render kết nối Atlas đã được kiểm chứng." : "Backend online chưa được xác minh đầy đủ."} Thông tin lớp/giảng viên/email được sinh viên cung cấp; dữ liệu bạn học thật, ảnh đầy đủ thanh địa chỉ/DevTools và nhận xét cá nhân vẫn cần bổ sung.`);

  newPage("3. Quá trình phát triển");
  h("3.1. Nhật ký thực hiện");
  p("Nhật ký dưới đây dựa trên thời điểm commit, không suy diễn số giờ làm việc. Không có dữ liệu theo dõi thời gian nên cột thời lượng ghi 'Không đo'.");
  table(["Ngày", "Công việc", "Thời lượng", "Commit"], [...logs].reverse().slice(-8).map(([hash,date,message]) => [date, message, "Không đo", hash]));
  h("3.2. Lịch sử commit");
  code(logs.slice(0,12).map(([hash,date,message]) => `${hash} ${date} ${message}`).join("\n"));
  p(`Mã nguồn đối chiếu đã push tại commit ${commit}. Trạng thái từng workflow được truy vấn từ API GitHub và lưu trong evidence/publication-results.json; chỉ kết luận thành công khi conclusion là success. Commit của deploy Render được ghi riêng trong evidence/deployment-results.json.`);
  for (const workflow of publication?.workflows || []) p(`${workflow.name}: ${workflow.conclusion} — ${workflow.url}`);
  h("3.3. Cấu trúc thư mục thực tế");
  code("backend/\n  app.js, server.js, seed.js, seed-data.js\n  models/{Permission,Role,User}.js\n  middleware/auth.js\n  routes/{auth,users,roles,permissions}.js\n  utils/{http,rbac}.js\n  scripts/{demo,verify-local,experiments,record-tests,build-report}.js\n  test/{api,seed}.test.js\nfrontend/index.html\npostman/Ex3-RBAC-T01-T24.postman_collection.json\nevidence/\nrender.yaml, README.md, AI-LOG.md");

  newPage("4. Kiến trúc và thiết kế đã hiện thực");
  h("4.1. Sơ đồ triển khai");
  code(onlineVerified ? `Chrome → ${publication.frontend.url}\n  │ HTTPS + CORS + Bearer token / JSON\n  ▼\n${publication.backend.apiBase}\n  │ authenticate → requirePermission → handler\n  │ Mongoose TLS, populate roles\n  ▼\nAtlas rbac-cluster (AWS AP_SOUTHEAST_1)\nDatabase it4409_rbac; collections users, roles, permissions\nNguồn trạng thái: evidence/deployment-results.json` : "Chrome → localhost:5500 → Express localhost:3001/api/v1 → MongoDB local\nDự kiến online: GitHub Pages → Render → MongoDB Atlas.");
  p(`Hình S00. Sơ đồ ${environmentLabel.toLowerCase()} dựng từ cấu hình đã kiểm chứng; không phải ảnh chụp dashboard.`);
  h("4.2. Khác biệt so với đề bài");
  table(["Đặc tả", "Trạng thái thực tế", "Lý do"], [["Dữ liệu thành viên thật", "20 hồ sơ giả lập + 1 tài khoản sinh viên demo + 4 tài khoản kiểm tra", "Người dùng yêu cầu tạo dữ liệu khi không có danh sách thật."], ["Atlas/online trong báo cáo", onlineVerified ? "Render và Atlas đã được kiểm chứng" : "Chưa xác minh đầy đủ", "Trạng thái có JSON từ công cụ và kiểm thử thực."], ["Ảnh online với URL/DevTools", `Ảnh viewport ${environmentLabel.toLowerCase()} và JSON`, "Viewport không chứa thanh địa chỉ/DevTools, không coi là đáp ứng đủ khung ảnh template."], ["Cấu trúc backend gợi ý", "Tách app.js và server.js", "Cho phép Supertest nạp app không cần bind port."]]);

  newPage("4.3. Bản đồ endpoint → mã nguồn");
  const routes = [];
  for (const [file,prefix] of [["auth",""],["users","/users"],["roles","/roles"],["permissions","/permissions"]]) {
    const name = `backend/routes/${file}.js`;
    read(name).split(/\r?\n/).forEach((line,index) => {
      const match = line.match(/router\.(get|post|put|patch|delete)\("([^"]+)"/);
      if (!match) return;
      const permission = line.match(/requirePermission\("([^"]+)"/);
      routes.push([`${match[1].toUpperCase()} ${prefix}${match[2] === "/" ? "" : match[2]}`, `${name}:${index+1}`, permission?.[1] || (match[2] === "/me" ? "Đã đăng nhập" : "Công khai")]);
    });
  }
  table(["Endpoint", "Vị trí handler", "Permission"], routes);
  p(`Commit tham chiếu: ${commit}. Mọi vị trí trên được tính tự động từ source, không phải số dòng ước lượng.`);
  p(ref("backend/middleware/auth.js", "async function authenticate"));
  p(ref("backend/routes/users.js", 'router.put("/:userId/roles/:roleId"'));

  newPage("5. Triển khai online");
  h("5.1. Lựa chọn nền tảng");
  p(onlineVerified ? "GitHub Pages phục vụ frontend tĩnh; Render Free chạy Express; MongoDB Atlas Free lưu dữ liệu. Project CNWeb-RBAC và cluster rbac-cluster được phát hiện trước khi triển khai và tái sử dụng, không tạo cluster/project trùng. Render workspace đã được chủ tài khoản xác nhận trước khi thao tác. Trạng thái deploy live và các request xác thực đã được kiểm chứng." : "GitHub Pages phục vụ frontend tĩnh; Render cho backend và MongoDB Atlas cho CSDL. Xem trạng thái kiểm chứng thực tế trong evidence/publication-results.json và evidence/deployment-results.json; chưa tuyên bố online hoàn chỉnh khi chưa đạt bộ kiểm thử.");
  h("5.2. Biến môi trường trên host");
  table(["Tên biến", "Mục đích", "Local / host"], [["MONGODB_URI", "Chuỗi kết nối MongoDB", "Atlas URI riêng, không xuất giá trị trong báo cáo"], ["JWT_SECRET", "Ký/kiểm tra JWT", "Secret riêng trên Render; không công khai"], ["ACCESS_TOKEN_TTL", "Thời hạn access token", "3600 giây"], ["CORS_ORIGINS", "Danh sách origin được đọc response", "https://maclehoang.github.io"], ["PORT", "Port HTTP server", "Do Render cung cấp; bind 0.0.0.0"], ["NODE_ENV", "Môi trường runtime", "production trên Render"]]);
  h("5.3. Các bước triển khai");
  p(onlineVerified ? "Đã liệt kê tài nguyên trước khi tạo; tái sử dụng Atlas; kiểm tra database trước seed; cấu hình secret và CORS; triển khai một Web Service Free; đổi API_BASE sang Render; push frontend; chạy collection và UI trên HTTPS. Seed chỉ chạy có chủ đích, không nằm trong start command. Lệnh build/start thực tế và commit deploy có trong deployment-results.json." : "Đã chuẩn bị cấu hình và runner. Các bước chỉ được xác nhận hoàn tất khi có trạng thái công cụ cùng kiểm thử online tương ứng.");
  p("Hình S01/S02. Chưa thu được ảnh dashboard Render/Atlas có thanh địa chỉ. Metadata thật từ plugin nằm trong evidence/deployment-results.json; không dựng ảnh dashboard giả để thay thế.");
  if (deployment) table(["Metadata từ công cụ", "Giá trị đã kiểm chứng"], [["Render", `${deployment.render.name}; ${deployment.render.plan}; ${deployment.render.region}`], ["Deploy", `${deployment.render.deploy.id}: ${deployment.render.deploy.status}`], ["Commit deploy", deployment.render.deploy.commit.id], ["Atlas", `${deployment.atlas.project} / ${deployment.atlas.cluster}; ${deployment.atlas.instanceType}; ${deployment.atlas.region}`], ["Database user", `${deployment.atlas.databaseUser}; ${deployment.atlas.userRole} trên ${deployment.atlas.database}`], ["Network Access", `${deployment.atlas.accessListEntries || "Chưa ghi nhận"} mục; các dải Render do chủ tài khoản sao chép từ Dashboard`], ["Seed ban đầu", deployment.seed ? "Database trống → 25 users, 5 roles, 10 permissions; không reset" : "Xem atlas-seed-results.json"]]);

  newPage("5.4. Sự cố khi triển khai");
  p(deployment?.incidents?.length ? deployment.incidents.join("\n") : "Không có sự cố online được ghi nhận trong dữ liệu triển khai hiện có; không suy đoán lỗi. Kết nối trực tiếp Atlas qua plugin đã trả Internal error, nên dùng URI do chủ tài khoản cung cấp trong .env cho seed và backend; không khai thác mật khẩu/cookie trình duyệt.");
  h("5.5. Số liệu đo trên bản online");
  p(`Bảng dưới là số đo ${environmentLabel} qua Node fetch, không phải thời gian từ giao diện DevTools. Mỗi URL có một mẫu; không đo cold start. Các sự kiện Network thực của Chrome được lưu riêng khi chạy browser online, với cache tắt và thông tin xác thực bị loại bỏ.`);
  table(["Request", "Status", "Thời gian (ms)", "Body (byte)", "Thời điểm UTC"], network.measurements.map((item) => [item.url,item.status,item.ms,item.bytes,item.at]));
  p("limit=100 có thể trả nhiều bản ghi hơn limit=10; xem số byte thực trong bảng. Một mẫu không đủ để kết luận hiệu năng ổn định. Render Free có thể ngủ khi nhàn rỗi; các số đo này không được coi là cold start hoặc tải production.");
  code(JSON.stringify(network.preflight, null, 2));
  p(`File nguồn: evidence/${onlineVerified ? "online/" : ""}network-results.json. Không lưu token, mật khẩu, JWT_SECRET hoặc URI có thông tin xác thực.`);

  newPage("6. Minh họa kết quả");
  h("6.1. Xác thực");
  p(`Ảnh dưới được chụp tự động từ Chrome headless tại ${onlineVerified ? publication.frontend.url : "http://127.0.0.1:5500/"}. Chưa đáp ứng yêu cầu thanh địa chỉ và giao diện DevTools trong template. Metadata đi kèm xác nhận URL thật; không chèn thanh URL giả lên ảnh.`);
  pic("S03-local-login-error.png", "Hình S03 (local). Sai mật khẩu hiển thị thông điệp từ server; mã 401 được xác nhận bằng test/API, không hiển thị DevTools trong ảnh.");
  pic("S04-local-admin.png", "Hình S04 (local). Header có Lê Minh Hoàng và tài khoản demo; super-admin thấy ba tab và thao tác quản trị.");

  newPage("6.2. Hiển thị theo quyền");
  pic("S05-local-manager.png", "Hình S05 (local). User-manager không thấy nút Xóa; tìm dòng bản thân để kiểm tra Khóa bị vô hiệu.");
  pic("S06-local-member.png", "Hình S06 (local). Member chỉ thấy tab Hồ sơ của tôi; quyền quản trị trống.");
  p(`Ngoài ảnh, kiểm thử trình duyệt xác nhận auditor không thấy nút tạo/xóa hoặc tab vai trò. Chi tiết: evidence/ui-results.json (${ui.passed.length} kịch bản đạt, ${ui.pageErrors.length} lỗi JavaScript trang).`);

  newPage("6.3. Quản lý người dùng");
  pic("S07-local-search.png", "Hình S07 (local). Tìm từ khóa nguyen trên backend, hiển thị phân trang và các hồ sơ giả lập khớp.");
  pic("S08a-local-validation.png", "Hình S08a (local). Modal thêm người dùng hiển thị validation cho các ô chưa hợp lệ.");
  pic("S08b-local-duplicate.png", "Hình S08b (local). Lỗi EMAIL_ALREADY_EXISTS được gắn dưới ô Email.");

  newPage("6.3. Quản lý người dùng – gán vai trò");
  pic("S09-local-assign.png", "Hình S09 (local). Checkbox vượt quyền bị khóa và vai trò hiện có của bản thân không thể tự gỡ.");
  p("Kiểm thử UI đã tạo user tạm, sửa số điện thoại, khóa, mở khóa và xóa mềm. Dữ liệu tạm được xóa mềm sau kịch bản. Postman T13 xác nhận hai lần PUT trả 204 và role auditor chỉ có một lần trong response GET vai trò.");
  p(ref("frontend/index.html", "function RoleAssignModal"));
  p(ref("backend/routes/users.js", "$addToSet"));

  newPage("6.4. Quản lý vai trò");
  pic("S10-local-role.png", "Hình S10 (local). Vai trò tùy chỉnh tro-giang và checkbox quyền được nhóm theo resource.");
  pic("S11-local-role-in-use.png", "Hình S11 (local). UI báo lỗi khi xóa vai trò đang được sử dụng; Postman T21 xác nhận 409 ROLE_IN_USE.");
  p("Kiểm thử UI bổ sung đã tạo custom role, sửa tên, thay bộ quyền và xóa role không sử dụng thành công.");

  newPage("6.5. Kỹ thuật");
  p(`Hình S12. Chưa có ảnh giao diện DevTools Network/preflight. Response OPTIONS thực trong ${onlineVerified ? "online/" : ""}network-results.json có status ${network.preflight.status}; sự kiện CDP online có trong browser-network-results.json.`);
  p(`Hình S13. Authorization đã được interceptor gắn; ví dụ đã che: ${network.authorizationExample}. Chưa có ảnh DevTools header online.`);
  pic("S14-local-mobile.png", "Hình S14 (local). Viewport 390×844; test xác nhận trang không tràn ngang và bảng cuộn trong vùng chứa.");
  p(ref("frontend/index.html", "api.interceptors.request.use"));

  newPage("7. Kiểm thử");
  h("7.1. Kết quả Postman T01–T24 trên bản online");
  p(`Kết quả ${environmentLabel} từ Newman: ${postman.requests.total} request, ${postman.assertions.total} assertion, ${postman.failures.length} lỗi. Thời điểm UTC: ${postman.at}. T13, T15 và T17 có nhiều request để kiểm tra trạng thái sau thao tác. Mỗi request đều có assertion status.`);
  table(["Case", `Kết quả ${environmentLabel}`, "Đạt?"], postman.executions.filter((item) => /^T\d/.test(item.name)).map((item) => [item.name, `${item.status}${item.code ? " " + item.code : ""}${item.issues ? " / " + item.issues.join(", ") : ""}`, item.assertions?.every((assertion) => assertion.passed) ? "Có" : "Không"]));
  p(`Hình S15. Chưa có ảnh giao diện Postman Runner; bằng chứng là evidence/${onlineVerified ? "online/" : ""}postman-results.json, thu từ Newman chạy collection gốc, không phải ảnh Postman.`);

  newPage("7.2. Các test chưa đạt");
  p(`Backend trên database thử nghiệm riêng: ${backend.total} test đạt, ${backend.failed} lỗi. Newman ${environmentLabel}: ${postman.assertions.total} assertion, ${postman.failures.length} lỗi. Browser ${environmentLabel}: ${ui.passed.length} kịch bản, ${ui.pageErrors.length} page error. Test chéo với mock server của giảng viên chưa chạy do chưa có URL mock.`);
  h("7.3. Kiểm thử bảo mật thủ công");
  p("Kịch bản được thực thi tự động trong page.evaluate của Chrome với tài khoản member, tương đương gọi fetch từ trang nhưng không phải ảnh Console thao tác tay. Backend từ chối tạo user dù request trực tiếp bỏ qua nút giao diện.");
  code(JSON.stringify(json(`${onlineVerified ? "online/" : ""}member-console-result.json`), null, 2));
  p(`Hình S16. Chưa có ảnh giao diện Console. File ${onlineVerified ? "online/" : ""}member-console-result.json chứa response fetch thực trong Chrome ${environmentLabel}.`);
  table(["Kịch bản UI đã đạt"], ui.passed.map((text) => [text]));

  newPage("8. Phân tích và giải thích");
  p("Phần này giữ các câu hỏi của template, kèm bằng chứng kỹ thuật do AI tổng hợp. Sinh viên cần tự viết lời giải, đánh giá cá nhân và xác nhận hiểu biết trước khi nộp. Không coi các ghi chú dưới đây là câu trả lời tự thuật đã được sinh viên xác nhận.");
  const q = (number) => { const question = questions[number-1]; h(question.title); question.prompts.forEach(p); };
  q(1);
  h("Dữ kiện để sinh viên tự trả lời", 3);
  table(["Thứ tự", "Thành phần", "Vai trò"], [[1,"CORS / express.json","Kiểm tra browser origin và parse JSON"],[2,"authenticate","JWT.verify; tìm user active; populate roles; hợp permission"],[3,'requirePermission("roles:assign")',"Thiếu quyền trả 403 FORBIDDEN"],[4,"serializeRbacWrite","Chờ lượt ghi trong cùng tiến trình Node; giữ khóa đến khi xử lý xong"],[5,"loadUser → loadRole","Nạp lại tài nguyên sau khi lấy khóa; tài nguyên thiếu trả 404"],[6,"missingPermissions","Role vượt quyền trả 403 PRIVILEGE_ESCALATION"],[7,"User.updateOne $addToSet","Thêm idempotent; trả 204 không body; giải phóng khóa trong finally"]]);
  code(JSON.stringify(experiments.trace, null, 2));
  p("Hình S17. Log được thu trong wrapper tạm của middleware authenticate trên database thử nghiệm riêng; chưa có ảnh console log. Gán auditor trả 204; nếu gán super-admin bằng manager, kiểm tra missingPermissions chặn trước updateOne.");
  p(ref("backend/routes/users.js", 'router.put("/:userId/roles/:roleId"'));

  newPage("8. Phân tích và giải thích – Câu 2–3");
  q(2);
  h("Kết quả thí nghiệm thực tế", 3);
  code(JSON.stringify(experiments.mutation, null, 2));
  p("Hình S18. Dữ liệu local từ bản route được compile trong bộ nhớ với biểu thức escape bị bỏ; route gốc trên đĩa không sửa. Đây là biến thể của thí nghiệm (b), khác quy trình sửa file rồi khôi phục trong template. T04 dùng từ khóa bình thường không phát hiện lỗi này; cần regression query chứa ký tự regex.");
  p(ref("backend/routes/users.js", "$regex: escapeRegex(keyword)"));
  q(3);
  p("Chưa có dữ kiện để khẳng định đoạn nào khó nhất với cá nhân sinh viên hoặc phiên bản đầu sinh viên viết sai ở đâu. Mã dưới là ví dụ tham khảo đã có trong sản phẩm; phần trải nghiệm cá nhân phải do sinh viên xác nhận.");
  const lines = read("backend/routes/roles.js").split(/\r?\n/); const start = lines.findIndex((line) => line.includes("const before = new Set"));
  code(lines.slice(start, start+9).join("\n"));
  p(ref("backend/routes/roles.js", "const before = new Set"));

  newPage("8. Phân tích và giải thích – Câu 4");
  q(4);
  const statusRows = [];
  for (const file of ["backend/middleware/auth.js","backend/routes/auth.js","backend/routes/users.js","backend/routes/roles.js"]) read(file).split(/\r?\n/).forEach((line,index) => { const matches = [...line.matchAll(/fail\(res, (401|403), "([A-Z_]+)"/g)]; for(const match of matches)statusRows.push([`${file}:${index+1}`,match[1],match[2]]); });
  table(["Vị trí", "HTTP", "error.code"], statusRows);
  p(`Frontend 401 xóa token và phát auth:expired; 403 phát auth:forbidden để tải lại /me. Nguồn: ${shortRef("frontend/index.html", 'if (status === 403)')}. Sinh viên tự chọn cặp tình huống dễ nhầm và giải thích.`);
  newPage("8. Phân tích và giải thích – Câu 5");
  q(5);
  code(JSON.stringify(experiments.revocation, null, 2));
  p("Hình S19. Chưa có ảnh hai cửa sổ online. Thí nghiệm API local dùng cùng access token trước/sau: GET 200 → gỡ role 204 → GET 403. Quyền không chứa trong JWT; authenticate đọc lại database. Nếu nhúng và tin quyền cũ trong token thì việc thu hồi sẽ bị trì hoãn đến lúc token hết hạn hoặc có cơ chế vô hiệu hóa bổ sung.");
  if (onlineVerified) table(["Đối chiếu online (T15)", "HTTP"], postman.executions.filter((item) => item.name.startsWith("T15")).map((item) => [item.name, item.status]));
  p(ref("backend/middleware/auth.js", 'User.findById(payload.sub).populate("roles")'));

  newPage("8. Phân tích và giải thích – Câu 6–8");
  q(6);
  p("Lỗi source thực được phát hiện ở seed.js trước lần sửa hiện tại: xóa ba collection trước khi gọi required cho các mật khẩu. Nếu cấu hình thiếu, seed có thể thất bại sau khi dữ liệu cũ đã bị xóa. Bản sửa xây dựng/validate toàn bộ users trước khi connect hoặc delete, và yêu cầu --reset khi database đã có user. Không tái hiện xóa dữ liệu thật; test seed xác nhận thiếu mật khẩu bị chặn ở bước buildUsers. Sinh viên cần tự xác định đây có phải lỗi khó nhất của mình hay không.");
  p(ref("backend/seed.js", "const users = buildUsers(env)"));
  q(7);
  p("Dữ kiện thiết kế: token lưu sessionStorage theo đặc tả; request interceptor đọc storage trước mỗi request. Lợi ích: phiên kết thúc khi đóng tab; hạn chế: script có XSS vẫn có thể đọc token. Không chuyển sang cookie httpOnly vì đề yêu cầu Bearer header và frontend CDN; triển khai cookie sẽ cần xem lại contract CORS/CSRF và tích hợp mock. Đây là phân tích kỹ thuật để sinh viên tự diễn đạt quyết định.");
  q(8);
  p(`Origin được đo: ${network.origin || "http://127.0.0.1:5500"}. ${onlineVerified ? "CORS_ORIGINS trên Render cho phép https://maclehoang.github.io." : "Backend demo cho phép localhost:5500 và 127.0.0.1:5500; chưa xác minh host."} Header ${environmentLabel} thực:`);
  code(JSON.stringify(network.preflight.headers, null, 2));
  p("Allow-Origin giới hạn origin được browser đọc; Allow-Methods liệt kê method cho preflight; Allow-Headers cho phép Authorization và Content-Type; Expose-Headers cho phép JS đọc Location. Chưa chạy thí nghiệm trên Console một trang bên ngoài. Postman không thực thi cơ chế CORS của browser, vì vậy CORS không thay thế authenticate/requirePermission.");

  newPage("8. Phân tích và giải thích – Câu 9–10");
  q(9);
  p("Ghi chú thiết kế, chưa implement: thêm departmentId vào User và dữ liệu ngữ cảnh quản lý; không lấy phạm vi khoa từ client để quyết định quyền. Tạo middleware kiểm tra scope sau authenticate, áp bộ lọc departmentId cho GET /users và kiểm tra target ở PATCH/gán role. Cần tránh IDOR khi gọi userId thuộc khoa khác, tránh gán role quản trị toàn hệ thống thông qua manager khoa và không cho tự sửa departmentId để vượt phạm vi. Test phải có hai khoa, cùng permission nhưng khác phạm vi. Sinh viên tự quyết định endpoint/permission mới và giải thích trên mô hình của mình.");
  q(10);
  table(["Hạn chế cụ thể", "Hướng cải thiện nếu có thêm thời gian"], [[onlineVerified ? "Render Free có thể ngủ khi nhàn rỗi; chưa có ảnh đủ ngữ cảnh template" : "Online chưa xác minh đầy đủ", "Đo cold start khi cần và chụp lại ảnh thanh địa chỉ/DevTools thật"],["Không có refresh/revoke token server", "Thiết kế refresh token quay vòng và logout server; nằm ngoài phần bắt buộc đã chốt"],["Khóa ghi RBAC mới chỉ bảo vệ trong một tiến trình Node", "Nếu chạy nhiều instance, chuyển sang khóa dùng chung/giao dịch ở database; test đồng thời một tiến trình hiện đã đạt"],["Seed dùng hồ sơ giả lập", "Đổi sang dữ liệu được xác minh/được phép sử dụng; giữ miền test cho QA"],["Danh sách role UI tải tối đa 100 role", "Phân trang hoặc tải mọi trang role để không thiếu khi dữ liệu lớn"],["Dev tooling có dependency cũ từ Newman", "Rà npm audit và tách runner khỏi production; production cài --omit=dev"]]);

  newPage("9. Khai báo sử dụng AI");
  p("Công cụ: OpenAI Codex. AI đã đọc yêu cầu, đề xuất kiến trúc, tạo/chỉnh sửa phần đáng kể mã nguồn backend/frontend, tạo test, dữ liệu giả lập, script thu bằng chứng và báo cáo này. Không khai báo là chỉ hỏi lỗi/cú pháp. Sinh viên chưa xác nhận đã tự hiểu và kiểm tra toàn bộ nội dung.");
  table(["Giai đoạn", "Nội dung hỗ trợ", "Kiểm chứng"], [["Đọc đề và lập plan", "18 endpoint, RBAC, FE, test, deploy, hồ sơ", "Đối chiếu PDF và template"],["Triển khai lần đầu", "Models, auth, routes, React, seed, Postman", "Test backend và JSX"],["Theo yêu cầu dữ liệu giả lập", "20 hồ sơ giả lập, demo local bền vững", "Test seed, chạy demo thực"],["Thu bằng chứng", "Newman, Chrome UI, network, thí nghiệm", `${backend.total} backend test; ${postman.assertions.total} assertion; ${ui.passed.length} UI case`],["Báo cáo", "Tổng hợp facts, source refs, ảnh và giới hạn", "Kèm JSON nguồn và script tái tạo"]]);
  p("Gợi ý/test chưa phù hợp đã được sửa: test T04 cũ chỉ duyệt dữ liệu trả về nên có thể pass với mảng rỗng. Bản mới yêu cầu có kết quả và từng user khớp keyword; T13 được bổ sung GET kiểm tra không trùng; T15 khôi phục manager trước T16 để T16 kiểm tra đúng thiếu quyền delete của manager. Browser selector ban đầu tìm exact 'Trợ giảng' không khớp vì cell gồm mô tả; sửa chọn cell code tro-giang. Chi tiết còn lại ghi trong AI-LOG.md.");
  p("Quy định trong tài liệu giới hạn việc dùng AI viết thay toàn bộ mã/câu trả lời mục 8. Mức hỗ trợ thực tế của bản này vượt việc hỏi lỗi hoặc cú pháp; cần trao đổi với giảng viên và tự hoàn thiện theo quy định học phần trước khi dùng làm bài nộp.");

  newPage("10. Tự đánh giá và bài học");
  h("10.1. Tự chấm theo thang điểm của đề");
  table(["Tiêu chí", "Điểm tối đa", "Tự chấm", "Căn cứ hiện có"], [["Xác thực", "1.0", "Chưa tự chấm", `Backend riêng và UI ${environmentLabel} đã kiểm tra`],["Người dùng", "2.0", "Chưa tự chấm", "CRUD, tìm/lọc/phân trang trong test"],["RBAC Backend", "2.0", "Chưa tự chấm", "T01–T24 và experiments.json"],["Vai trò", "1.0", "Chưa tự chấm", "Test API và CRUD role UI"],["Chuẩn API", "1.0", "Chưa tự chấm", "HTTP/error contract tests"],["Frontend", "2.0", "Chưa tự chấm", "Bốn role, mobile, interceptor"],["Postman, dữ liệu, vấn đáp", "1.0", "Chưa tự chấm", `Newman ${environmentLabel}; dữ liệu giả lập; chưa vấn đáp`],["Cộng điểm", "+1.0", "Không xác nhận", onlineVerified ? "Có triển khai online; không tự nhận điểm" : "Online chưa xác minh"]]);
  p("Không tự ghi điểm tổng khi thiếu xác nhận hiểu biết của sinh viên, kiểm thử mock, hồ sơ online và tiêu chí dữ liệu thật. Các test local đạt không đồng nghĩa bài đạt điểm tối đa.");
  h("10.2. Bài học");
  p("Các quan sát kỹ thuật có bằng chứng: (1) permission bị gỡ làm token cũ trả 403 ngay vì middleware đọc DB; (2) query có ký tự regex gây 500 nếu bỏ escape, nhưng 200 với source gốc; (3) UI ẩn nút vẫn cần backend chặn fetch trực tiếp. Đây là dữ kiện để sinh viên viết ba bài học cá nhân và điều sẽ làm khác nếu bắt đầu lại; chưa tự nhận các trải nghiệm này thay cho sinh viên.");
  h("Cam kết");
  p("Bản báo cáo có hỗ trợ AI và dữ liệu giả lập đã được khai báo. Chưa thay sinh viên ký hoặc xác nhận lời cam kết cá nhân. Lê Minh Hoàng cần đọc lại, sửa phần phân tích bằng lời của mình, bổ sung thông tin còn thiếu và ký sau khi kiểm chứng.");
  p(`Ngày tạo bản kỹ thuật: ${timestamp}. Người được ghi tên: Lê Minh Hoàng, MSSV 20251295M. Chữ ký: chưa xác nhận.`);
}

const escape = (value) => String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function renderHtml() {
  const render = (block) => {
    if (block.type === "p") return `<p>${escape(block.text)}</p>`;
    if (block.type === "h") return `<h${block.level}>${escape(block.text)}</h${block.level}>`;
    if (block.type === "code") return `<pre>${escape(block.text)}</pre>`;
    if (block.type === "table") return `<table><thead><tr>${block.headers.map((item)=>`<th>${escape(item)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row)=>`<tr>${row.map((item)=>`<td>${escape(item)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    if (block.type === "image") return `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(evidence,block.filename)).toString("base64")}"><figcaption>${escape(block.caption)}</figcaption></figure>`;
    return `<table>${pages.filter((item)=>item.title&&item.title!=="MỤC LỤC").map((item)=>`<tr><td>${escape(item.title)}</td><td>${pdfPageMap[pages.indexOf(item)] || pages.indexOf(item)+1}</td></tr>`).join("")}</table>`;
  };
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><title>${baseName}</title><style>@page{size:A4;margin:17mm 18mm}body{font-family:Arial,sans-serif;color:#1c293d;font-size:10pt;line-height:1.35;margin:0}section{break-after:page}section:last-child{break-after:auto}h1{font-size:17pt;color:#124c6b;line-height:1.25;margin:0 0 14px}h2{font-size:12pt;margin:13px 0 7px}h3{font-size:10.5pt}p{margin:7px 0;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;margin:10px 0;font-size:8.5pt}th,td{border:1px solid #cbd5e1;text-align:left;padding:5px;vertical-align:top;overflow-wrap:anywhere}th{background:#eaf1f7}tr,figure{break-inside:avoid}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f5f9;padding:9px;font:8pt Consolas,monospace}figure{margin:10px 0}img{width:100%;max-height:205px;object-fit:contain;object-position:left top;border:1px solid #dce3eb}figcaption{font-size:8.5pt;margin:5px 0;color:#475569}</style><body>${pages.map((item)=>`<section>${item.blocks.map(render).join("")}</section>`).join("")}</body></html>`;
}

async function buildDocx() {
  const children = [];
  const paragraph = (text, options = {}) => new D.Paragraph({ spacing: { after: 100 }, ...options, children: [new D.TextRun({ text, size: 20 })] });
  for (const [index,item] of pages.entries()) {
    if (index) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    for (const block of item.blocks) {
      if (block.type === "p") children.push(paragraph(block.text));
      else if (block.type === "h") children.push(new D.Paragraph({ text: block.text, heading: block.level === 1 ? D.HeadingLevel.HEADING_1 : D.HeadingLevel.HEADING_2, spacing: { before: 120, after: 140 } }));
      else if (block.type === "code") for (const line of block.text.split("\n")) children.push(new D.Paragraph({ spacing: { after: 0 }, children: [new D.TextRun({ text: line, font: "Consolas", size: 15 })] }));
      else if (block.type === "image") {
        const data = fs.readFileSync(path.join(evidence,block.filename));
        const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
        const scale = Math.min(550 / width, 205 / height);
        children.push(new D.Paragraph({ children: [new D.ImageRun({ type: "png", data, transformation: { width: width*scale, height: height*scale } })] }));
        children.push(paragraph(block.caption));
      } else {
        const rows = block.type === "toc" ? [["Nội dung", "Trang PDF"], ...pages.filter((value)=>value.title&&value.title!=="MỤC LỤC").map((value)=>[value.title,String(pdfPageMap[pages.indexOf(value)] || pages.indexOf(value)+1)])] : [block.headers,...block.rows];
        children.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, rows: rows.map((row,rowIndex)=>new D.TableRow({ tableHeader: rowIndex === 0, cantSplit: true, children: row.map((cell)=>new D.TableCell({ shading: rowIndex === 0 ? {fill:"EAF1F7"} : undefined, children: [new D.Paragraph({ spacing: { after: 50 }, children: [new D.TextRun({ text: String(cell), size: 17, bold: rowIndex===0 })] })] })) })) }));
      }
    }
  }
  const doc = new D.Document({ creator: "Lê Minh Hoàng; tổng hợp với OpenAI Codex", title: `Báo cáo Fullstack RBAC – ${environmentLabel}, dữ liệu giả lập`, description: "Bằng chứng thực; khai báo AI tại mục 9.", features: { updateFields: true }, styles: { default: { document: { run: { font: "Arial", size: 20 } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 964, bottom: 964, left: 1020, right: 1020 } } }, footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun(`RBAC • ${environmentLabel} / dữ liệu giả lập • Trang `), new D.TextRun({children:[D.PageNumber.CURRENT]})] })] }) }, children }] });
  fs.writeFileSync(path.join(root,`${baseName}.docx`), await D.Packer.toBuffer(doc));
}

async function main() {
  populate(await templateQuestions());
  const htmlPath = path.join(root, `${baseName}.html`);
  const pdfPath = path.join(root, `${baseName}.pdf`);
  const textPath = path.join(root, "backend/.runtime/report-pages.txt");
  fs.mkdirSync(path.dirname(textPath), { recursive: true });
  let physicalPages;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage();
    for (let pass = 0; pass < 3; pass++) {
      fs.writeFileSync(htmlPath, renderHtml());
      await page.goto(new URL(`file:///${htmlPath.replace(/\\/g,"/")}`).href);
      await page.pdf({ path: pdfPath, format: "A4", printBackground: true, displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: `<div style="width:100%;text-align:center;font:9px Arial;color:#64748b">${environmentLabel} • Dữ liệu giả lập • <span class="pageNumber"></span> / <span class="totalPages"></span></div>` });
      execFileSync(process.env.PDFTOTEXT || "pdftotext", ["-layout", pdfPath, textPath]);
      const extracted = fs.readFileSync(textPath, "utf8").split("\f").filter((text) => text.trim());
      physicalPages = extracted.length;
      const normalize = (text) => text.replace(/\s+/g, " ").trim();
      const nextMap = pages.map((item, index) => {
        if (!item.title || item.title === "MỤC LỤC") return index + 1;
        const found = extracted.findIndex((text, pageIndex) => pageIndex >= 2 && normalize(text).startsWith(normalize(item.title)));
        if (found < 0) throw new Error(`PDF heading not found: ${item.title}`);
        return found + 1;
      });
      if (JSON.stringify(nextMap) === JSON.stringify(pdfPageMap)) break;
      if (pass === 2) throw new Error("PDF table of contents did not stabilize.");
      pdfPageMap = nextMap;
    }
  } finally { await browser.close(); }
  await buildDocx();
  fs.writeFileSync(path.join(evidence,"report-manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), sourceCommit: commit, contentPages: pages.length, physicalPdfPages: physicalPages, pdfTableOfContents: pages.filter((item) => item.title && item.title !== "MỤC LỤC").map((item) => ({ title: item.title, page: pdfPageMap[pages.indexOf(item)] })), environment: environmentLabel, syntheticData: true, deploymentVerified: onlineVerified, files: ["docx","pdf","html"].map((ext)=>`${baseName}.${ext}`) },null,2));
  console.log(`Created DOCX, PDF and HTML report: ${pages.length} planned pages; source commit ${commit}`);
}
main().catch((error)=>{ console.error(error); process.exitCode=1; });
