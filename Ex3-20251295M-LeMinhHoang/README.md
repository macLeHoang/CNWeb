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

Frontend mặc định gọi `http://localhost:3001/api/v1`. Khi triển khai, chỉ thay hằng `API_BASE` trong `frontend/index.html` bằng URL Render.

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

## Báo cáo

Mở `Ex3-RBAC-20251295M-LeMinhHoang.docx` hoặc `.pdf` ở thư mục Ex3. HTML cùng tên là bản tự chứa ảnh để xem/in. Báo cáo bám cấu trúc mục 1–10, giữ câu hỏi mục 8 và ghi trung thực các phần chưa thực hiện. Chưa có deploy online, ảnh DevTools/Atlas/Render, thông tin lớp/giảng viên và xác nhận trải nghiệm cá nhân. Đây là bản kỹ thuật local, chưa phải bộ hồ sơ đạt toàn bộ tiêu chí nộp bài.

`npm.cmd run package:submission` tạo `Ex3-20251295M-LeMinhHoang-Local.zip`, gồm source, lockfile, `.env.example`, Postman, báo cáo và bằng chứng; loại `node_modules`, `.env`, database local và cache.

Workflow `.github/workflows/ex3-rbac.yml` sẽ tự chạy backend tests, kiểm tra JSX và thí nghiệm bảo mật khi push/PR thay đổi Ex3. Chưa chạy trên GitHub khi chưa đăng nhập và push. Khóa ghi trong `middleware/rbac-write.js` bảo vệ super-admin cuối cùng trước thao tác đồng thời ở một tiến trình Node; muốn chạy nhiều instance cần cơ chế khóa database dùng chung.

## Deploy

- MongoDB Atlas: database `it4409_rbac`; chỉ cho phép IP phát triển và outbound IP của Render.
- Render Web Service: Root Directory `Ex3-20251295M-LeMinhHoang/backend`, Build Command `npm ci --omit=dev`, Start Command `npm start`. Có cấu hình `render.yaml`.
- Render secrets: `MONGODB_URI`, `JWT_SECRET`, `ACCESS_TOKEN_TTL`, `CORS_ORIGINS`.
- GitHub Pages: frontend nằm tại `Ex3-20251295M-LeMinhHoang/frontend/`; CORS phải cho phép origin `https://maclehoang.github.io`.

Không chạy seed trong lệnh start của Render. Seed mặc định từ chối database đã có user; `npm.cmd run seed -- --reset` xóa ba collection RBAC và tạo lại sau khi kiểm tra cấu hình. Chỉ dùng `--reset` khi chủ động muốn mất dữ liệu cũ.

## Nội dung cần cá nhân hóa trước khi seed/nộp

- Xác nhận email thật của `20251295M`.
- Danh sách 20 hồ sơ trong `SYNTHETIC_USERS` có sẵn manager, auditor, member và custom role. Danh sách giả lập không đáp ứng tiêu chí dữ liệu người thật nếu giảng viên không cho phép thay thế.
- Điền thông tin lớp, mã lớp, giảng viên và nhóm trong báo cáo.
- Điền mật khẩu bốn tài khoản chấm trong Postman và báo cáo; không commit mật khẩu hoặc `.env`.
