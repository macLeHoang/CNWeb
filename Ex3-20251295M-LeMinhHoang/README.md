# Ex3 – Fullstack RBAC

Ứng dụng quản lý người dùng và phân quyền theo đặc tả IT4409. Backend dùng Express, MongoDB/Mongoose và JWT; frontend là React 18 + Axios chạy trực tiếp từ CDN.

## Chạy local

1. Sao chép `backend/.env.example` thành `backend/.env` và điền đầy đủ biến môi trường.
2. Thay các dòng dữ liệu mẫu trong `backend/seed.js` bằng họ tên/email thật trước khi nộp.
3. Trong thư mục `backend`, chạy:

   ```powershell
   npm.cmd install
   npm.cmd run seed
   npm.cmd start
   ```

4. Mở thư mục `frontend` bằng Live Server tại `http://127.0.0.1:5500`. Không mở bằng `file://`.

Frontend mặc định gọi `http://localhost:3001/api/v1`. Khi triển khai, chỉ thay hằng `API_BASE` trong `frontend/index.html` bằng URL Render.

## Kiểm thử

```powershell
cd backend
npm.cmd test
npm.cmd run check:frontend
```

Import `postman/Ex3-RBAC-T01-T24.postman_collection.json`, điền bốn mật khẩu collection variable, chạy `Setup`, `T01–T24`, rồi `Cleanup`. Trước một lượt chạy mới, để trống biến `runEmail`.

## Deploy

- MongoDB Atlas: database `it4409_rbac`; chỉ cho phép IP phát triển và outbound IP của Render.
- Render Web Service: Root Directory `Ex3-20251295M-LeMinhHoang/backend`, Build Command `npm ci`, Start Command `npm start`.
- Render secrets: `MONGODB_URI`, `JWT_SECRET`, `ACCESS_TOKEN_TTL`, `CORS_ORIGINS`.
- GitHub Pages: frontend nằm tại `Ex3-20251295M-LeMinhHoang/frontend/`; CORS phải cho phép origin `https://maclehoang.github.io`.

Không chạy `npm run seed` trong lệnh start của Render vì seed sẽ xóa dữ liệu hiện có.

## Nội dung cần cá nhân hóa trước khi seed/nộp

- Xác nhận email thật của `20251295M`.
- Thay `Thành Viên Nhóm` và email bằng dữ liệu thật; bổ sung ít nhất một `user-manager` và một `auditor` trong nhóm.
- Thay `Bạn Ngồi Xung Quanh` bằng tên thật.
- Điền thông tin lớp, mã lớp, giảng viên và nhóm trong báo cáo.
- Điền mật khẩu bốn tài khoản chấm trong Postman và báo cáo; không commit mật khẩu hoặc `.env`.
