# Design QA — Các luồng xác thực HiHiEnglish

## 1. Luồng quên mật khẩu

**Nguồn thiết kế**

- `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-71e35b63-0ea5-4537-90df-a6dfcc162aa0.png`
- Kích thước nguồn: `1672 × 941`.
- Ba thẻ nguồn được cắt và chuẩn hóa về `430 × 870` pixel để đối chiếu trực tiếp.

**Bằng chứng triển khai**

- Quên mật khẩu: `D:\Code\ShowdingEng\backend\design-qa-evidence\forgot-password-final.png`
- Xác nhận email: `D:\Code\ShowdingEng\backend\design-qa-evidence\verify-email-final.png`
- Đặt mật khẩu mới: `D:\Code\ShowdingEng\backend\design-qa-evidence\reset-password-final.png`
- Di động — quên mật khẩu: `D:\Code\ShowdingEng\backend\design-qa-evidence\forgot-password-mobile-final.png`
- Di động — đặt mật khẩu mới: `D:\Code\ShowdingEng\backend\design-qa-evidence\reset-password-mobile-final.png`
- So sánh quên mật khẩu: `D:\Code\ShowdingEng\backend\design-qa-evidence\comparison-forgot-final.png`
- So sánh xác nhận email: `D:\Code\ShowdingEng\backend\design-qa-evidence\comparison-verify-final.png`
- So sánh đặt mật khẩu mới: `D:\Code\ShowdingEng\backend\design-qa-evidence\comparison-reset-final.png`

**Kết quả**

- Ba route dùng chung một shell responsive và giữ nguyên API, điều hướng, OTP, đếm ngược, quy tắc mật khẩu và nút hiện/ẩn mật khẩu.
- Global dark mode đã được vô hiệu hóa trong phạm vi luồng xác thực để khớp giao diện sáng.
- Không còn sai lệch P0/P1/P2 có thể hành động.

## 2. Đăng nhập và đăng ký

**Nguồn thiết kế**

- `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-cf57324f-9c0a-4c3a-9558-8ea2e7b29395.png`
- Kích thước nguồn: `1672 × 941`.
- Thẻ đăng nhập được đối chiếu ở `482 × 850` pixel.
- Thẻ đăng ký được đối chiếu ở `464 × 890` pixel.

**Bằng chứng triển khai**

- Đăng nhập hiện tại: `D:\Code\ShowdingEng\backend\design-qa-evidence\account-login-current.png`
- Đăng ký hiện tại: `D:\Code\ShowdingEng\backend\design-qa-evidence\account-register-current.png`
- So sánh đăng nhập, nguồn bên trái / triển khai bên phải: `D:\Code\ShowdingEng\backend\design-qa-evidence\account-login-comparison.png`
- So sánh đăng ký, nguồn bên trái / triển khai bên phải: `D:\Code\ShowdingEng\backend\design-qa-evidence\account-register-comparison.png`

**Trạng thái kiểm thử**

- Đăng nhập: trạng thái rỗng, kiểm tra lỗi khi gửi thiếu email/mật khẩu, kiểm tra nút hiện mật khẩu và liên kết quên mật khẩu.
- Đăng ký: trạng thái rỗng, kiểm tra lỗi khi thiếu họ tên, nút hiện mật khẩu, checkbox chính sách và liên kết sang đăng nhập.
- Google OAuth: giữ nguyên hàm điều hướng `/api/auth/google`; không khởi chạy đăng nhập thật trong QA.
- Giao diện di động: kiểm tra ở viewport CSS quan sát được `417 × 902`; không có overflow ngang, cả hai màn hình nằm gọn trong viewport.
- Theme: ứng dụng đang ở dark mode toàn cục, nhưng hai thẻ xác thực chủ động giữ light mode giống nguồn.

**Độ trung thực**

- Bố cục: vị trí logo, tiêu đề, vùng form, CTA, đường phân cách, Google button và footer khớp nhịp dọc của ảnh mẫu.
- Kiểu chữ: giữ Inter/system sans-serif, tiêu đề navy đậm, nội dung phụ xám và liên kết xanh.
- Trường nhập: chiều cao, bo góc, viền, icon, placeholder và focus ring đồng nhất giữa hai trang.
- Màu sắc: sử dụng nền raster trắng–lavender với vòm xanh tím lớn và CTA raster xanh–tím; không dùng placeholder hay emoji.
- Tài sản thương hiệu: dùng lại wordmark HiHiEnglish hiện có và icon Google hiện có.
- Responsive: desktop dùng thẻ bo tròn có shadow; màn hình nhỏ chuyển sang layout trắng toàn màn hình.
- Khả năng truy cập: có semantic heading, aria-label, focus-visible, trạng thái disabled, autocomplete và vùng chạm thực tế.

**Lịch sử so sánh**

1. Bản đầu phát hiện chữ Google bị global dark mode đổi sang màu sáng.
2. Đã thêm override light-mode có scope cho Google button.
3. Đối chiếu lại toàn thẻ cho thấy không còn sai lệch P0/P1/P2.
4. Checkbox đăng ký vẫn mặc định chưa chọn để người dùng chủ động đồng ý chính sách; đây là khác biệt có chủ ý so với trạng thái đã chọn trong mock.

**Kiểm tra kỹ thuật**

- [x] Production client build hoàn tất.
- [x] Không có lỗi browser console trong lượt QA cuối.
- [x] Không có overflow ngang ở màn hình nhỏ.
- [x] Giữ nguyên logic đăng nhập, đăng ký, Google OAuth và điều hướng.
- [x] Không gửi dữ liệu đăng nhập/đăng ký thật trong QA.

## 3. Điều chỉnh khoảng cách ô nhập — 20px

**Nguồn thay đổi**

- Đăng nhập: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-fb6b522b-78fc-413e-a11f-0ea9718336fd.png` (`495 × 136`).
- Đăng ký: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-f69fc448-3426-4ea7-8587-d607aca403b9.png` (`495 × 136`).
- Yêu cầu định lượng của người dùng: khoảng cách dọc giữa các ô nhập là `20px` trên cả hai trang.

**Bằng chứng triển khai**

- Đăng nhập: `D:\Code\ShowdingEng\backend\design-qa-evidence\account-login-gap20.png` (`468 × 778`).
- Đăng ký: `D:\Code\ShowdingEng\backend\design-qa-evidence\account-register-gap20.png` (`468 × 778`).
- So sánh vùng nhập đăng nhập, nguồn bên trái / triển khai bên phải: `D:\Code\ShowdingEng\backend\design-qa-evidence\account-login-gap20-comparison.png`.
- So sánh vùng nhập đăng ký, nguồn bên trái / triển khai bên phải: `D:\Code\ShowdingEng\backend\design-qa-evidence\account-register-gap20-comparison.png`.
- Browser computed style xác nhận `.account-auth-fields` có `gap: 20px` tại `/dang-nhap` và `/dang-ky`.
- Trạng thái: form rỗng, light-mode xác thực, viewport trình duyệt trong ứng dụng `468 × 778`, không overflow ngang ở trang đăng ký.

**Kết quả kiểm tra**

- Spacing/layout: hai trang dùng cùng khoảng cách `20px`; không còn nhịp dọc `40px`/`36px` trước đó.
- Typography, màu, hình nền, icon, nội dung và kích thước trường nhập không thay đổi.
- Logic form, Google OAuth, nút hiện mật khẩu, checkbox và điều hướng được giữ nguyên.
- Không còn sai lệch P0/P1/P2 đối với yêu cầu khoảng cách mới.

## 4. Điều chỉnh kích thước checkbox đăng ký

**Nguồn thay đổi**

- Browser Comment 1 tại `/dang-ky`, selector `.account-auth-agreement > input`, viewport chú thích `471 × 784`.
- Ảnh trạng thái trước thay đổi dùng làm nguồn đối chiếu: `D:\Code\ShowdingEng\backend\design-qa-evidence\account-register-gap20.png` (`468 × 778`).
- Mục tiêu: checkbox có kích thước thị giác cân với dòng chữ chính sách, không thay đổi các thành phần lân cận.

**Bằng chứng triển khai**

- Ảnh toàn trang sau thay đổi: `D:\Code\ShowdingEng\backend\design-qa-evidence\account-register-checkbox-text-size.png` (`468 × 778`).
- So sánh vùng checkbox, trạng thái cũ bên trái / trạng thái mới bên phải: `D:\Code\ShowdingEng\backend\design-qa-evidence\account-register-checkbox-comparison.png` (`660 × 54`).
- Trình duyệt xác nhận checkbox `14 × 14px`, chữ `13px` với line-height `19.5px`, căn giữa bằng margin-top `2.75px`.

**Kết quả kiểm tra**

- Checkbox mới có chiều cao thị giác tương đương chữ, không còn lớn vượt trội như trạng thái `21 × 21px` trước đó.
- Trạng thái chưa chọn và đã chọn đều hoạt động; checkbox vẫn được gắn đúng nhãn truy cập.
- Typography, màu, ảnh, nội dung, khoảng cách form `20px` và logic đăng ký không thay đổi.
- Không có overflow ngang hoặc sai lệch P0/P1/P2.

final result: passed
