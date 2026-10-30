# Trạng thái Ex3 sau triển khai online – 30/10/2026

Người dùng yêu cầu hoàn thiện Ex3 trên GitHub Pages + Render + MongoDB Atlas, cho phép dữ liệu giả lập, không tạo tài nguyên trùng và không phát sinh chi phí khi chưa chấp thuận. Giữ nguyên thay đổi Ex1/Ex2 của người dùng.

## Đã kiểm chứng

- Repo: https://github.com/macLeHoang/CNWeb, main. Commit frontend đã kiểm thử: 65507de908ebb6f6ee8357f798dc1cc1506a691e. Các commit hồ sơ tiếp theo có thể mới hơn; dùng git log để kiểm tra, không tự suy đoán hash.
- Frontend: https://maclehoang.github.io/CNWeb/Ex3-20251295M-LeMinhHoang/frontend/ trả HTTP 200, API_BASE đã là Render.
- Backend: https://ex3-rbac-20251295m.onrender.com/api/v1. GET /me không token trả 401 UNAUTHENTICATED.
- Render workspace được người dùng xác nhận: Hoàng's workspace, tea-dbiab9gae00c73blk3cg. Kiểm kê trước tạo không trả dịch vụ; kiểm kê cuối có đúng một Web Service Free Singapore: srv-dbib532fngtc73cqepf0.
- Deploy live: dep-dbib63qjnfac73darvn0, backend commit e90cef4c330c89d53c3082ec43ef72d6af913054. Những commit sau đổi frontend, runner và báo cáo; không đổi runtime backend. Dùng [skip render] khi chỉ cập nhật hồ sơ/frontend để tránh build không cần thiết.
- Plugin không hỗ trợ Root Directory: lệnh thực tế là cd Ex3-20251295M-LeMinhHoang/backend && npm ci --omit=dev và cd Ex3-20251295M-LeMinhHoang/backend && npm start. Không Apply Blueprint để tạo lại service.
- Atlas project có sẵn CNWeb-RBAC (6ae4a6a7b12851a5aca399ea), cluster Free rbac-cluster, AWS Singapore. Đã tái sử dụng; không tạo project/cluster mới.
- Khi người dùng yêu cầu tự điền URI, tạo user dịch vụ ex3-render-20251295m, chỉ readWrite trên it4409_rbac, scope rbac-cluster; giữ hai user cũ. Mật khẩu do Atlas plugin sinh, không công khai.
- Atlas access list giữ IP phát triển /32 hiện có, thêm đúng 74.220.52.0/24, 74.220.60.0/24 do chủ tài khoản sao chép từ Render Dashboard. Không mở Atlas ra toàn Internet.
- Kiểm tra database trống trước seed: 25 users, 5 roles, 10 permissions; không reset, không seed trong start command. Kiểm kê sau QA: 28 users gồm 25 active + 3 deleted; 5 roles và 10 permissions.
- Backend local trước đó: 36 tests đạt. Runner vừa được kiểm tra lại: local 37 assertions Newman + 11 UI scenarios đạt. Online: 37 assertions Newman + 11 UI scenarios đạt, không page error. CORS preflight 204 và Allow-Origin đúng Pages. Các mẫu đo đơn lẻ không phải cold start/benchmark production.
- GitHub Actions và Pages cho commit 65507de thành công; URL và commit trong evidence/publication-results.json.

## Lỗi thật đã xử lý

1. Deploy đầu dep-dbib542fngtc73cqer20 update_failed do Atlas chưa cho outbound Render. Log thật trong evidence/render-initial-failure.json. Thêm hai CIDR ở trên rồi deploy lại cùng service thành công.
2. Lượt UI online đầu phát hiện race: RolesPage.saved tải danh sách trước reloadMe; me cập nhật muộn gây unmount modal vừa mở. Đã sửa để giữ loading tới khi reloadMe hoàn tất, rồi để effect tải một lần. Lượt chạy sau kiểm tra cả PATCH/PUT 200 và đạt đủ 11 kịch bản. Bảo tồn evidence/online-attempt-1; xóa đúng role QA chưa gán cho ai bằng mã cụ thể, không reset DB.

## Báo cáo và dữ liệu riêng

- Ex3-RBAC-20251295M-LeMinhHoang.{docx,pdf,html} đã cập nhật online; PDF 29 trang, mục lục đối chiếu trang thật. Cấu trúc 1–10 và câu hỏi mục 8 được giữ.
- Thông tin do người dùng cung cấp: IT4409-1-26 (26.1A01); ThS. Nguyễn Mạnh Tuấn; hoang.lm251295M@sis.hust.edu.vn; không có nhóm BTL. Tài khoản seed của chủ bài vẫn là tài khoản demo 20251295m@example.test; không tự coi email demo là email SIS.
- Mọi hồ sơ bạn học là giả lập. Không nhận là danh sách người thật. Khai báo AI đầy đủ; không tự nhận trải nghiệm, điểm số, hiểu biết hoặc chữ ký thay sinh viên.
- Ảnh online nằm dưới evidence/online/. Hậu tố window là ảnh PrintWindow nguyên cửa sổ Chrome có thanh URL thật, đúng PID do Playwright mở, không chèn URL giả. Ảnh viewport gốc + metadata cũng được giữ. Không đọc profile/cookie hoặc dò cửa sổ Chrome cá nhân.
- Chưa có ảnh dashboard Render/Atlas, GUI DevTools/Postman, ảnh log/phá code/hai cửa sổ theo một số khung template. JSON plugin, CDP, Newman và thí nghiệm local được ghi đúng loại; không giả làm ảnh công cụ. Mục 8 và cam kết cá nhân cần sinh viên tự hoàn thiện/xác nhận; mock server giảng viên chưa có URL để test chéo.
- URI riêng: backend/.env; JWT và mật khẩu ứng dụng: backend/.runtime/online.env; tài khoản chấm để chuyển riêng: backend/.runtime/grader-access.md. Không đưa các tệp này vào Git/ZIP/báo cáo công khai, không xuất nội dung ra log/chat.
- npm.cmd run package:submission tạo ZIP Submission, bỏ .env, .runtime, node_modules, coverage. SHA-256 ở evidence/submission-manifest.json (không nhét manifest này vào ZIP để tránh hash vòng).

## Nếu cần tiếp tục

Đọc bằng chứng hiện có trước; không tạo lại service/cluster/user hoặc seed lại database. prepare-online.js --check chỉ đọc. Runner dùng secrets riêng; VERIFY_BROWSER_ONLY=1 giữ Newman hiện có khi chỉ kiểm tra UI. Render Free có thể ngủ khi nhàn rỗi; chưa đo cold start. Nếu sửa runtime backend thì cần deploy mã mới, theo dõi đến live và xác minh; nếu chỉ đổi hồ sơ thì không kích hoạt thêm build backend.
