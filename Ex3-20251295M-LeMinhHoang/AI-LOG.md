# Nhật ký sử dụng AI – Ex3 RBAC

Tệp này là dữ liệu nguồn để khai báo trung thực tại mục 9 của báo cáo. Sinh viên cần kiểm tra, bổ sung các lần sử dụng khác và diễn đạt lại bằng hiểu biết của mình.

| Ngày | Công cụ | Mục đích | Kết quả/gợi ý | Cách kiểm chứng |
|---|---|---|---|---|
| 27–28/10/2026 | OpenAI Codex | Đọc đề, phân rã yêu cầu và lập kế hoạch | Checklist backend, frontend, Postman, deploy và báo cáo | Đối chiếu trực tiếp PDF 44 trang và template DOCX |
| 27–28/10/2026 | OpenAI Codex | Hỗ trợ tạo khung triển khai Fullstack RBAC | Models, middleware, 18 route, frontend React CDN, seed và Postman collection | Chạy test tích hợp T01–T24 và kiểm tra từng contract API |
| 28/10/2026 | OpenAI Codex | Kiểm tra lỗi và hành vi biên | Bổ sung kiểm tra CORS, locked account, CRUD role và đồng bộ quyền sau 403 | `npm test`: 30/30; `npm run check:frontend`: JSX hợp lệ |

## Nội dung cần khai báo rõ trong báo cáo

- AI đã tạo và chỉnh sửa một phần đáng kể mã nguồn; không được ghi là chỉ hỏi cú pháp.
- Sinh viên phải tự đọc, chạy, sửa và giải thích được từng phần trước khi nộp/vấn đáp.
- Các câu trả lời phân tích ở mục 8 phải do sinh viên tự viết từ commit, log, ảnh và thí nghiệm thật; không sao chép câu trả lời do AI tạo.
- Nếu AI gợi ý sai trong các lần làm tiếp theo, ghi lại gợi ý, dấu hiệu phát hiện và cách sửa thực tế.
