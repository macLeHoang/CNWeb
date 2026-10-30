# Nhật ký sử dụng AI – Ex3 RBAC

Tệp này là dữ liệu nguồn để khai báo trung thực tại mục 9 của báo cáo. Sinh viên cần kiểm tra, bổ sung các lần sử dụng khác và diễn đạt lại bằng hiểu biết của mình.

| Ngày | Công cụ | Mục đích | Kết quả/gợi ý | Cách kiểm chứng |
|---|---|---|---|---|
| 27–28/10/2026 | OpenAI Codex | Đọc đề, phân rã yêu cầu và lập kế hoạch | Checklist backend, frontend, Postman, deploy và báo cáo | Đối chiếu trực tiếp PDF 44 trang và template DOCX |
| 27–28/10/2026 | OpenAI Codex | Hỗ trợ tạo khung triển khai Fullstack RBAC | Models, middleware, 18 route, frontend React CDN, seed và Postman collection | Chạy test tích hợp T01–T24 và kiểm tra từng contract API |
| 28/10/2026 | OpenAI Codex | Kiểm tra lỗi và hành vi biên | Bổ sung kiểm tra CORS, locked account, CRUD role và đồng bộ quyền sau 403 | `npm test`: 30/30; `npm run check:frontend`: JSX hợp lệ |
| 29–30/10/2026 | OpenAI Codex | Người dùng yêu cầu tự tạo dữ liệu và hoàn thiện báo cáo | 20 hồ sơ giả lập, demo MongoDB local, sửa seed để validate trước khi xóa; báo cáo DOCX/PDF/HTML | 32 test backend; 37 assertion Newman; 11 kịch bản Chrome; bằng chứng JSON và ảnh local |
| 30/10/2026 | OpenAI Codex | Thí nghiệm bảo mật và đối chiếu template | Wrapper log permission, route regex thử nghiệm trong bộ nhớ, thu hồi role với token cũ; giữ nguyên câu hỏi mục 8 | `evidence/experiments.json`; báo cáo ghi rõ local, thiếu deploy và phần xác nhận cá nhân |
| 30/10/2026 | OpenAI Codex | Bổ sung regression test sau rà soát | JWT có sub sai; khóa/xóa/gỡ role của super-admin cuối cùng bằng tài khoản khác; email sau xóa mềm và query regex | Tổng cuối: 35 test backend, 37 assertion Newman, 11 kịch bản UI đều đạt |
| 30/10/2026 | OpenAI Codex | Tiếp tục hoàn thiện theo yêu cầu | Khóa ghi RBAC trong một tiến trình; test hai thao tác đồng thời; workflow GitHub Actions; kiểm tra quyền triển khai | 36 backend test đạt; git push dry-run bị chặn vì chưa đăng nhập; Render/Atlas chưa kết nối |

## Nội dung cần khai báo rõ trong báo cáo

- AI đã tạo và chỉnh sửa một phần đáng kể mã nguồn; không được ghi là chỉ hỏi cú pháp.
- Sinh viên phải tự đọc, chạy, sửa và giải thích được từng phần trước khi nộp/vấn đáp.
- Các câu trả lời phân tích ở mục 8 phải do sinh viên tự viết từ commit, log, ảnh và thí nghiệm thật; không sao chép câu trả lời do AI tạo.
- Nếu AI gợi ý sai trong các lần làm tiếp theo, ghi lại gợi ý, dấu hiệu phát hiện và cách sửa thực tế.
| 30/10/2026 | OpenAI Codex + Render/Atlas plugins | Triển khai theo yêu cầu tiếp tục | Kiểm kê và tái sử dụng project/cluster Atlas; user dịch vụ quyền tối thiểu; seed khi database trống; một Render Free service; runner HTTPS và báo cáo theo môi trường thực | Seed 25 user/5 role/10 permission; local Newman 37 assertions và Chrome 11 kịch bản đạt; deploy đầu lỗi access list có log thật, đã thêm hai CIDR từ Dashboard do chủ bài cung cấp |
| 30/10/2026 | OpenAI Codex | Sửa lỗi phát hiện trên bản online | Lượt Chrome đầu dừng ở sửa quyền role: reloadMe hoàn tất sau khi tải danh sách làm unmount modal mới mở. Giữ trạng thái loading tới khi hồ sơ được làm mới rồi tải một lần; runner kiểm tra PATCH/PUT thật | Giữ evidence/online-attempt-1; Newman online đã đạt 37 assertions; chạy lại UI trên bản Pages mới |
| 30/10/2026 | OpenAI Codex | Chốt kiểm chứng và hồ sơ online | Thu ảnh nguyên cửa sổ Chrome QA theo PID riêng, không đọc Chrome cá nhân; cập nhật lớp/giảng viên/email từ chủ bài; đối chiếu mục lục PDF và quét secret | Online 37 assertions + 11 UI case đạt; PDF 29 trang; đúng một Render service; 25 active/3 QA xóa mềm; 140 tệp công khai không chứa secret riêng |
