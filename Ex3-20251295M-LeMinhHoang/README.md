# Ex3 – Fullstack RBAC

Ứng dụng quản lý người dùng và phân quyền theo đặc tả IT4409. Backend dùng Express, MongoDB/Mongoose và JWT; frontend là React 18 + Axios chạy trực tiếp từ CDN.

## Chạy local

Chạy demo đầy đủ, không cần Atlas hoặc `.env`:

```powershell
cd Ex3-20251295M-LeMinhHoang\backend
npm.cmd ci
npm.cmd run demo
```

Mở `http://127.0.0.1:5500/`. Đăng nhập `20251295m@example.test` / `Demo@2026`. Bốn tài khoản `gv.admin.20251295@example.test`, `gv.manager.20251295@example.test`, `gv.auditor.20251295@example.test`, `gv.member.20251295@example.test` dùng cùng mật khẩu demo. Toàn bộ 20 bạn học là giả lập theo yêu cầu người dùng. Mật khẩu demo công khai chỉ dành cho local.

MongoDB được tải tự động trong lần chạy đầu (cần Internet); dữ liệu tồn tại dưới `backend/.runtime/mongo`. Dừng bằng Ctrl+C. JWT secret mới được tạo mỗi lần khởi động nên phải đăng nhập lại sau khi restart. React/Axios/Babel được tải qua CDN.

Nếu dùng MongoDB/Atlas riêng:

1. Sao chép `backend/.env.example` thành `backend/.env`, điền chuỗi kết nối và mọi mật khẩu riêng.
2. Trong thư mục `backend`, chạy:

   ```powershell
   npm.cmd install
   npm.cmd run seed
   npm.cmd start
   ```

3. Mở thư mục `frontend` bằng Live Server tại `http://127.0.0.1:5500`. Không mở bằng `file://`.

Frontend được cấu hình gọi `https://ex3-rbac-20251295m.onrender.com/api/v1`. Khi chạy demo local, đổi hằng `API_BASE` trong `frontend/index.html` thành `http://localhost:3001/api/v1`, rồi hoàn nguyên trước khi push.

## Kiểm thử

```powershell
cd backend
npm.cmd test
npm.cmd run check:frontend
npm.cmd run verify:backend
npm.cmd run verify:experiments
# Giữ npm run demo chạy trong terminal khác; cần Google Chrome và CDN:
npm.cmd run verify:local
npm.cmd run report
npm.cmd run package:submission
```

Import `postman/Ex3-RBAC-T01-T24.postman_collection.json`, điền bốn mật khẩu collection variable, chạy `Setup`, `T01–T24`, rồi `Cleanup`. Trước một lượt chạy mới, để trống biến `runEmail`. Runner tự động dùng mật khẩu demo trong bộ nhớ; không lưu token đầy đủ vào bằng chứng. Kết quả kiểm chứng và ảnh local nằm trong `evidence/`.

## Kiểm thử online và thông tin riêng

Tài nguyên đã được kiểm kê trước khi triển khai: Atlas project `CNWeb-RBAC`, cluster Free `rbac-cluster` ở Singapore được tái sử dụng. User dịch vụ `ex3-render-20251295m` chỉ có `readWrite` trên database `it4409_rbac`, giới hạn cluster này. Không sử dụng mật khẩu demo công khai cho các tài khoản online.

- URI riêng nằm trong `backend/.env`; các mật khẩu kiểm thử/JWT nằm trong `backend/.runtime/online.env`. Cả hai đều bị Git và script đóng gói loại bỏ.
- `node scripts/prepare-online.js --check` kiểm kê database chỉ đọc. Chỉ seed khi cả ba collection trống; script không reset hoặc đổi mật khẩu dữ liệu đã tồn tại.
- `npm.cmd run verify:online` nhận URL và mật khẩu từ `.runtime/online.env`, chạy Newman và Chrome trên HTTPS; lưu dưới `evidence/online/`. Trên Windows, đặt `VERIFY_WINDOW_SCREENSHOTS=1` để chụp nguyên cửa sổ Chrome QA với thanh URL thật bằng PrintWindow theo đúng PID do runner mở. `VERIFY_BROWSER_ONLY=1` chỉ chạy lại browser và phép đo, giữ kết quả Newman trước đó.
- `node -r dotenv/config scripts/verify-publishing.js dotenv_config_path=.runtime/online.env` xác minh Pages/API và trạng thái CI thực.
- Mật khẩu tài khoản chấm được cấp riêng trong `backend/.runtime/grader-access.md`; chủ bài chuyển riêng cho giảng viên, không commit hoặc đưa vào báo cáo công khai.

## Báo cáo

Mở `Ex3-RBAC-20251295M-LeMinhHoang.docx` hoặc `.pdf` ở thư mục Ex3. HTML cùng tên tự chứa ảnh. Bản online hiện có 29 trang PDF, giữ cấu trúc mục 1–10 và câu hỏi mục 8. Newman đạt 37 assertions, Chrome đạt 11 kịch bản; xem `evidence/report-manifest.json`. Mục lục PDF được đối chiếu với trang thực bằng `pdftotext` (cần cài và có trong PATH; có thể chỉ định biến `PDFTOTEXT`). Ảnh hậu tố `window` chứa thanh URL thật; ảnh viewport gốc cũng được giữ. Metadata JSON không được coi là ảnh dashboard/DevTools. Lớp, giảng viên và email sinh viên đã được chủ bài cung cấp; nhận xét cá nhân và chữ ký vẫn cần sinh viên tự xác nhận. Các khung ảnh công cụ còn thiếu được ghi rõ trong báo cáo.

`npm.cmd run package:submission` tạo ZIP hậu tố `Submission` khi API online đã được xác minh, hoặc `Local` nếu chưa. ZIP gồm source, lockfile, `.env.example`, Postman, báo cáo và bằng chứng; loại `node_modules`, `.env`, `.runtime`, database local và cache. SHA-256 được ghi trong `evidence/submission-manifest.json` bên ngoài ZIP.

Workflow `.github/workflows/ex3-rbac.yml` tự chạy backend tests và thí nghiệm bảo mật khi push/PR thay đổi Ex3. Trạng thái từng lần chạy nằm trong `evidence/publication-results.json`. Khóa ghi trong `middleware/rbac-write.js` bảo vệ super-admin cuối cùng trước thao tác đồng thời ở một tiến trình Node; muốn chạy nhiều instance cần cơ chế khóa database dùng chung.

## Deploy

- MongoDB Atlas: database `it4409_rbac`; chỉ cho phép IP phát triển và outbound IP của Render.
- Render Web Service Free: `ex3-rbac-20251295m`, Singapore, https://ex3-rbac-20251295m.onrender.com. Plugin không hỗ trợ đặt Root Directory nên lệnh thực là `cd Ex3-20251295M-LeMinhHoang/backend && npm ci --omit=dev` và `cd Ex3-20251295M-LeMinhHoang/backend && npm start`. `render.yaml` giữ cấu hình tương đương cho Blueprint; không Apply lại để tạo trùng service.
- Render secrets: `MONGODB_URI`, `JWT_SECRET`, `ACCESS_TOKEN_TTL`, `CORS_ORIGINS`.
- GitHub Pages: frontend nằm tại `Ex3-20251295M-LeMinhHoang/frontend/`; CORS phải cho phép origin `https://maclehoang.github.io`.

Không chạy seed trong lệnh start của Render. Seed mặc định từ chối database đã có user; `npm.cmd run seed -- --reset` xóa ba collection RBAC và tạo lại sau khi kiểm tra cấu hình. Chỉ dùng `--reset` khi chủ động muốn mất dữ liệu cũ.

## Nội dung cần cá nhân hóa trước khi seed/nộp

- Xác nhận email thật của `20251295M`.
- Danh sách 20 hồ sơ trong `SYNTHETIC_USERS` có sẵn manager, auditor, member và custom role. Danh sách giả lập không đáp ứng tiêu chí dữ liệu người thật nếu giảng viên không cho phép thay thế.
- Điền thông tin lớp, mã lớp, giảng viên và nhóm trong báo cáo.
- Điền mật khẩu bốn tài khoản chấm trong Postman và báo cáo; không commit mật khẩu hoặc `.env`.
