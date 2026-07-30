# Triển khai API quên mật khẩu từ nhánh email

Nhánh phát triển trong repository này là `codex/email`. Nhánh mặc định hiện tại của repository là `master` (không phải `main`).

## Kiến trúc

Git branch không tự gọi API. Sau khi deploy `codex/email`, frontend được build từ `master` sẽ gọi URL HTTP của deployment đó cho riêng bốn endpoint quên mật khẩu:

- `POST /api/auth/forgot-password`
- `POST /api/auth/resend-reset-code`
- `POST /api/auth/verify-reset-code`
- `POST /api/auth/reset-password`

Deployment email phải dùng cùng `DATABASE_URL` với backend chính vì nó cần đọc bảng `users` và cập nhật mật khẩu của chính tài khoản đó. Không dùng database preview tách biệt cho production.

## Biến môi trường của deployment email

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://...
AUTO_SYNC_DB=true

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Shadowing ENGLISH <your-email@gmail.com>

# Origin của frontend chính; nhiều origin phân tách bằng dấu phẩy.
CORS_ORIGINS=https://app.example.com
```

Với Gmail, `SMTP_PASS` phải là App Password, không phải mật khẩu đăng nhập Gmail. Tài khoản cần bật xác minh hai bước trước khi tạo App Password.

Khi khởi động, Prisma sẽ thêm cột `attempts` vào bảng `password_resets` nếu `AUTO_SYNC_DB=true`. Với quy trình production có migration riêng, hãy tắt tự đồng bộ sau khi schema đã được áp dụng.

## Biến môi trường khi build frontend chính

Đặt URL deployment email, bao gồm `/api` và không có dấu `/` cuối:

```dotenv
VITE_EMAIL_API_BASE_URL=https://email-api-production.up.railway.app/api
```

Sau đó build/deploy lại frontend từ `master`. Các API khác tiếp tục dùng `/api`; chỉ luồng quên mật khẩu dùng server email.

## Kiểm tra nhanh

```bash
curl -X POST https://email-api-production.up.railway.app/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

API luôn trả nội dung chung, kể cả email chưa đăng ký, để tránh làm lộ danh sách tài khoản. OTP hết hạn sau 10 phút, bị vô hiệu sau 5 lần nhập sai; reset token hết hạn sau 15 phút và chỉ dùng được một lần.
