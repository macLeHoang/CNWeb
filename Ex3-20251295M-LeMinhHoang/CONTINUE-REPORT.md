# Tiếp tục hoàn thiện báo cáo Ex3

Người dùng đã yêu cầu thực hiện toàn bộ phần bắt buộc và hồ sơ nộp bài, đã cho phép tạo dữ liệu giả lập và triển khai GitHub Pages + Render + MongoDB Atlas. Không chuyển sang stack hoặc host khác. Không phát sinh chi phí nếu chưa được người dùng chấp thuận.

## Trạng thái đã xác minh

- Repo: https://github.com/macLeHoang/CNWeb, nhánh main. Commit đã push: 6850ce3e3b68680dcc34142f1973f505d8b270e4.
- Backend đủ 18 endpoint; 36 backend tests đạt; Newman 37 assertions đạt; Chrome UI 11 kịch bản đạt.
- GitHub Actions Ex3 thành công: https://github.com/macLeHoang/CNWeb/actions/runs/41065593328.
- GitHub Pages thành công và HTTP 200: https://maclehoang.github.io/CNWeb/Ex3-20251295M-LeMinhHoang/frontend/.
- Frontend online vẫn có API_BASE=http://localhost:3001/api/v1; chưa có backend online được xác minh.
- 25 tài khoản seed; 20 hồ sơ bạn học là giả lập, dùng example.test. Không được khai thành dữ liệu người thật.
- Báo cáo DOCX/PDF/HTML cùng tên Ex3-RBAC-20251295M-LeMinhHoang; bản trước có 25 trang PDF, cần cập nhật sau triển khai.
- Render và MongoDB Atlas đã được danh mục plugin xác nhận installed=true ở lần kiểm tra cuối. Tuy nhiên, phiên hội thoại cũ không có tool Render/Atlas và không có tool_search để nạp chúng. Cần phiên mới để dùng plugin đã cài; không yêu cầu cài lại.

## Làm tiếp khi phiên mới có công cụ

1. Đọc skill Render/Atlas hiện được cung cấp và xác minh tài khoản/workspace/project. Liệt kê trước khi tạo để tránh trùng tài nguyên.
2. Dùng Atlas Free cluster cho it4409_rbac. Thiết lập database user, IP máy phát triển và dải outbound Render. Không đọc/chia sẻ cookie hoặc mật khẩu trình duyệt.
3. Dùng backend/seed.js để seed sau khi có cấu hình. Mọi mật khẩu được kiểm tra trước khi ghi; database đã có user chỉ được reset bằng --reset khi người dùng thực sự muốn mất dữ liệu. Không seed trong start command.
4. Tạo Render Web Service từ repo main, Root Directory Ex3-20251295M-LeMinhHoang/backend, Build npm ci --omit=dev, Start npm start. server.js dùng PORT và host 0.0.0.0. MONGODB_URI/JWT_SECRET là secrets. CORS_ORIGINS=https://maclehoang.github.io.
5. Đổi API_BASE trong frontend/index.html thành URL Render/api/v1, commit/push đúng tệp. Giữ nguyên các thay đổi chưa commit ở Ex1/Ex2.
6. Tham khảo scripts/verify-local.js khi chạy Newman và browser QA online; script hiện hardcode localhost, cần sửa cho phép base URL/credentials qua env. Không xuất JWT/URI/password thật vào log hay báo cáo công khai.
7. Thu minh chứng S00–S19 theo template DOCX. Các ảnh hiện trong evidence là viewport local, không phải ảnh online có thanh URL/DevTools. Không bịa dashboard, log, số đo hoặc ảnh online.
8. Chỉnh backend/scripts/build-report.js dựa trên bằng chứng thật. Mục 8 có câu hỏi và dữ kiện kỹ thuật; không bịa trải nghiệm cá nhân, tự nhận hiểu biết, chữ ký, lớp/email/giảng viên chưa được cung cấp. Giữ khai báo AI đầy đủ.
9. npm.cmd run report tạo DOCX/PDF/HTML; kiểm tra phân trang/PDF và mục lục. npm.cmd run package:submission tạo ZIP không gồm node_modules, .env, .runtime. Ghi commit có nội dung và push.

## Các tệp cần đọc

- README.md trong thư mục Ex3; backend/.env.example; render.yaml.
- Ex3. Fullstack RBAC - 20261.pdf; Ex3-RBAC-MaSV-HoTenSV.docx.
- backend/scripts/{verify-local,verify-publishing,build-report,package-submission}.js.
- evidence/{publication-results,backend-results,postman-results,ui-results,experiments}.json.

Các helper Chrome cũ trong backend/.runtime không đăng nhập được. Người dùng đăng nhập ở Chrome khác; cửa sổ đó không bật CDP. Không tái sử dụng profile/cookie cá nhân hoặc dò cửa sổ ngoài Render/Atlas. Ưu tiên tool hai plugin trong phiên mới.
