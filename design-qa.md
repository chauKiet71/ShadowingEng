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

## 5. Login form box size reduction (30%)

**Source visual truth**

- Browser Comment 1 on `/dang-nhap`, targeting `.account-auth-form` at a `418 x 776` CSS viewport.
- Pre-change capture: `D:\Code\ShowdingEng\backend\design-qa-artifacts\login-before.jpg` (`414 x 769` pixels from the browser capture backend).
- Normalized source: `D:\Code\ShowdingEng\backend\design-qa-artifacts\login-before-normalized.jpg` (`418 x 776` pixels).
- User requirement: reduce the login form boxes by 30% while preserving the surrounding login screen.

**Implementation evidence**

- Final capture: `D:\Code\ShowdingEng\backend\design-qa-artifacts\login-after-final.jpg` (`418 x 776` pixels).
- Side-by-side normalized comparison, source on the left and implementation on the right: `D:\Code\ShowdingEng\backend\design-qa-artifacts\login-normalized-comparison.jpg` (`836 x 776` pixels).
- CSS viewport: `418 x 776`; device pixel ratio reported by the page: `1.125`.
- State: light theme, empty login form, no validation or loading state.

**Full-view comparison evidence**

- Email and password boxes changed from `66px` to `46px` (`30.30%` reduction).
- Primary login button changed from `64px` to `45px` (`29.69%` reduction).
- Google button changed from `64px` to `45px` (`29.69%` reduction).
- The form width, logo, heading, copy, colors, icons, and footer content were preserved.
- The full form height changed from `430.5px` to `312.5px`; this is a `27.41%` reduction because readable text line heights remain unchanged.
- Focused image crops were not needed: every changed control is clearly legible in the normalized `418 x 776` side-by-side comparison, and computed dimensions provide exact focused evidence.

**Required fidelity surfaces**

- Fonts and typography: font family, sizes, weights, and copy are unchanged; only box geometry and associated vertical rhythm changed.
- Spacing and layout rhythm: input gap and the forgot-link, CTA, and divider margins were reduced proportionally; no horizontal overflow is visible.
- Colors and visual tokens: borders, blue-violet CTA treatment, link color, backgrounds, and contrast are unchanged.
- Image quality and asset fidelity: the HiHiEnglish wordmark, Google icon, and CTA raster treatment remain the existing production assets and render sharply.
- Copy and content: all login copy is unchanged.

**Comparison history**

1. Initial implementation reduced inputs and the primary CTA by about 30%, but the Google button remained `50.78px` tall because inherited vertical padding limited it to a `20.66%` reduction. This was a P2 mismatch against the explicit numeric request.
2. The login-scoped Google button padding was reset and its height fixed at `45px`.
3. Post-fix evidence confirms all requested boxes are within `0.31` percentage points of the 30% target; no actionable P0/P1/P2 findings remain.

**Interaction and technical checks**

- Password visibility toggles from `password` to `text` and back to `password`.
- Production client build passes.
- Browser console reports no errors in the final QA state.
- Login submission and Google OAuth were not triggered, so no account data was transmitted.

## 6. Speaking scenario card redesign

**Source visual truth**

- Browser Comment 1 additional image attachment: the compact “Marketing Strategy” card supplied in the current conversation. The attachment renderer did not expose a local filesystem path.
- Displayed source crop: approximately `330 × 88px`; visible card: approximately `322 × 70px`.
- Target characteristics: compact bordered card, `12px` corner radius, subtle elevation, `40px` circular icon, title and green difficulty badge on one row, and a small gray description below.

**Implementation evidence**

- Full active-theme capture: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-scenario-cards-implementation.png` (`414 × 769px` browser capture).
- Focused card crop: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-scenario-card-focused.png` (`382 × 68px`).
- Source-width responsive capture: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-scenario-cards-source-width.png`.
- Source-width focused crop: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-scenario-card-source-width-focused.png` (`323 × 68px`).
- CSS viewport for the main capture: `418 × 776`; device pixel ratio: `1.125`.
- Normalized responsive state: the first card measured `322.67 × 68px` in CSS, matching the source card width; it returns to `382.22 × 68px` at the active `418px` viewport.
- State: `/luyen-noi`, dark theme selected by the application, A2 level selected, no loading or error state.

**Full-view and focused comparison**

- The source attachment and the source-width focused implementation crop were compared together in the current visual QA pass. Both use the same compact hierarchy: circular icon, title plus a small green badge, then description.
- The implementation keeps the existing dark theme as an intentional product constraint; border, background, icon tint, and badge colors are token-adapted equivalents of the light reference.
- At source width, the card is within roughly `2px` of the source height and within `1px` of the source width. The icon is exactly `40 × 40px`; border radius is `12px`.
- The surrounding screen is unchanged except that the denser cards allow more topics above the fixed bottom navigation. No horizontal overflow or clipped card content is visible.
- Focused evidence is required because the supplied source covers only the card component; the full-screen capture is used to verify integration and surrounding-layout preservation.

**Required fidelity surfaces**

- Fonts and typography: existing Inter/system sans is retained; title uses a compact semibold `13px/18px` treatment, badge uses `9px`, and description uses `11px/15px`. Copy remains legible at the smallest tested width.
- Spacing and layout rhythm: `12px` horizontal card padding, `10px` vertical padding, `12px` icon/content gap, `12px` radius, `68px` minimum height, and a subtle one-pixel shadow reproduce the source density.
- Colors and visual tokens: the green difficulty badge maps to `Dễ`; `Vừa` uses amber and `Khó` uses rose. Existing scenario accent colors and dark-mode tokens are preserved.
- Image quality and asset fidelity: no raster assets are present in the source card. Existing Lucide scenario icons remain vector-sharp and are presented in the source’s circular icon treatment.
- Copy and content: scenario title and description are preserved. Role information remains available to assistive technology while being visually removed to match the compact reference.

**Comparison history and findings**

1. The original cards were roughly `106px` tall, used rounded-square icons, lacked a difficulty badge, and displayed an extra visible role line. This was the principal P1 mismatch against the supplied component reference.
2. The cards were rebuilt with the compact source structure and responsive sizing. The first implementation measured `382.22 × 68px` at the active viewport and `322.67 × 68px` at the normalized source width.
3. Post-fix visual comparison found no actionable P0/P1/P2 differences. The light-source/dark-implementation color difference is an intentional theme adaptation rather than design drift.

**Interaction and technical checks**

- A2 and B1 filters remain interactive; B1 correctly exposes one `Vừa` card and A2 restores nine `Dễ` cards.
- Scenario buttons remain enabled and preserve the existing start-session handler; no real speaking session was created during QA.
- Production client build passes.
- Browser console reports no errors in the final QA state.

### 6.1. Shared conversation icon for every scenario

**Source visual truth**

- Browser Comment 1 additional image attachment in the current conversation: two overlapping blue chat bubbles centered in a pale-blue circular tile.
- Visible source icon tile: approximately `40 × 40px`; the attachment renderer did not expose a local filesystem path.

**Implementation evidence**

- Full browser capture: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-scenario-cards-shared-icon.png`.
- Focused icon crop: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-shared-icon-focused.png` (`42 × 42px`, containing the `40 × 40px` tile).
- CSS viewport: `418 × 776`; device pixel ratio: `1.125`; route `/luyen-noi`; dark theme; A2 selected.

**Comparison and fidelity surfaces**

- Full-view comparison confirms all nine visible scenario cards now use the same icon without changing card height, text wrapping, spacing, badges, navigation, or list behavior.
- Focused comparison confirms the source structure: filled overlapping speech bubbles, blue foreground, pale-blue circular background, and centered `40px` tile.
- Browser-computed values are identical across sampled cards: tile `40 × 40px`, background `rgb(243, 246, 255)`, foreground `rgb(52, 120, 246)`.
- Typography and copy are unchanged. Layout rhythm remains `12px` between icon and content. Colors match the supplied icon direction in both application themes. The icon uses the existing vector icon library, so edges remain sharp and no raster placeholder, emoji, CSS drawing, or handcrafted SVG is introduced.

**Findings and checks**

- The previous per-scenario icons were the only P1 mismatch against this new annotation. They were replaced with the shared conversation icon.
- Post-fix DOM inspection confirms `9` scenario cards and `9` `messages-square` icons.
- Production client build and Prettier check pass.
- Browser console reports no errors; no speaking session or external side effect was triggered.
- No actionable P0/P1/P2 findings remain.

### 6.2. Exact user-supplied chat icon asset

**Source visual truth**

- `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-b18bcce2-e6f3-4542-a6be-9a0d15820959.png` (`134 × 89px`, opaque ARGB raster).
- The supplied image contains two filled blue speech bubbles on a pale-blue background. Its visible blue artwork bounds are approximately `71 × 57px` inside the source raster.

**Implementation evidence**

- Project asset copy: `D:\Code\ShowdingEng\backend\client\public\images\speaking\chat-bubbles.png`.
- Full browser capture: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-scenario-cards-exact-chat-asset.png`.
- Focused implementation crop: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-exact-chat-icon-focused.png` (`42 × 42px`).
- Normalized comparison, source on the left and browser implementation on the right: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-exact-chat-icon-comparison.png` (`92 × 42px`).
- CSS viewport: `418 × 776`; device pixel ratio: `1.125`; route `/luyen-noi`; dark theme; A2 selected.

**Full-view and focused comparison**

- Full-view comparison confirms all nine visible cards now load the exact supplied PNG rather than a library approximation.
- The source raster is rendered at `40 × 26.56px` inside the existing `40 × 40px` circular tile. This keeps the source artwork at approximately `21 × 17px`, matching its original internal scale.
- The circular mask and `rgb(240, 244, 255)` tile background integrate the opaque rectangular source without a visible edge. The focused side-by-side comparison confirms identical bubble silhouette, overlap, blue tones, antialiasing, and artwork proportions.

**Required fidelity surfaces and findings**

- Fonts and typography: unchanged.
- Spacing and layout rhythm: card geometry, `40px` icon tile, `12px` content gap, badges, and list density are unchanged.
- Colors and tokens: the tile background matches the source corner color; source blue pixels are preserved because the original raster is used directly.
- Image quality and asset fidelity: the exact user-supplied `134 × 89px` raster is used; no SVG, icon-library substitute, emoji, CSS drawing, or generated approximation remains.
- Copy and content: unchanged; the decorative image uses empty alt text so it does not duplicate each button's accessible label.
- DOM inspection confirms `9` scenario cards and `9` instances of `/images/speaking/chat-bubbles.png`, all with the correct natural dimensions.
- Production client build and Prettier check pass; browser console reports no errors.
- The prior library approximation was the only P1 mismatch. It has been replaced, and no actionable P0/P1/P2 findings remain.

### 6.3. Dark-mode icon tile

**Source visual truth**

- `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-12d55904-303b-4c42-ab18-66290781b5b6.png` (`61 × 68px`).
- User requirement: when the application is in dark mode, the icon tile must use a dark surface instead of retaining the light circular background shown in the source capture.

**Implementation evidence**

- Full browser capture: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-scenario-cards-dark-icon-tile.png`.
- Focused dark icon crop: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-dark-icon-focused.png` (`42 × 42px`).
- Before/after comparison, supplied light tile on the left and implemented dark tile on the right: `D:\Code\ShowdingEng\backend\design-qa-evidence\speaking-dark-icon-before-after.png` (`100 × 50px`).
- Transparent source-derived asset: `D:\Code\ShowdingEng\backend\client\public\images\speaking\chat-bubbles-transparent.png` (`134 × 89px`).
- CSS viewport: `418 × 776`; device pixel ratio: `1.125`; route `/luyen-noi`; A2 selected; confirmed `<html class="dark">` state.

**Full-view and focused comparison**

- Full-view comparison confirms all nine icon tiles now follow the dark card palette instead of appearing as bright white circles.
- Focused before/after evidence shows the tile changing from the supplied pale surface to `dark:bg-neutral-800` while retaining the exact blue chat-bubble artwork, scale, alignment, and circular `40 × 40px` geometry.
- The original opaque pale matte was removed from a copy of the user-supplied PNG so the image can sit cleanly on both theme surfaces without a rectangular halo.

**Required fidelity surfaces and findings**

- Fonts and typography: unchanged.
- Spacing and layout rhythm: card size, tile size, icon scale, content gap, badges, and list density are unchanged.
- Colors and tokens: light mode keeps `#f0f4ff`; dark mode uses the existing neutral-800 token (`oklch(0.269 0 0)` in the browser) for a coherent dark surface.
- Image quality and asset fidelity: the two blue bubbles remain source-derived and sharply rendered; the transparent matte has no visible pale or rectangular edge in the focused browser capture.
- Copy and content: unchanged; decorative images remain hidden from accessibility names.
- Browser inspection confirms dark mode is active and all `9` cards load the transparent asset.
- Production client build and Prettier check pass; browser console reports no errors.
- The light tile in dark mode was the only P1 mismatch. It has been corrected, and no actionable P0/P1/P2 findings remain.

final result: passed

## 20. Video subtitle vocabulary detail sheet

**Source visual truth**

- Reference loading state: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-cfb424fc-409b-484a-91fa-148e4a7090b0.png` (`402 x 561px`).
- Target flow: `/dich-video`, open a READY translated video, then select an English word in a subtitle card.

**Implementation evidence**

- Stable loading capture: `C:\Users\DELL\AppData\Local\Temp\video-word-detail-loading-stable-qa.png` (`516 x 958px`).
- Completed detail capture: `C:\Users\DELL\AppData\Local\Temp\video-word-detail-qa.png` (`516 x 958px`).
- Browser viewport override: `418 x 776` CSS pixels; the in-app browser capture backend emitted `516 x 958px` images.
- The reference is a focused crop of the sheet while the implementation evidence includes the dimmed video background, so the comparison is based on the shared sheet region rather than absolute top offset.

**Full-view and focused comparison evidence**

- The loading state matches the reference hierarchy: rounded white bottom sheet, centered drag handle, sticky title row, circular close action, centered indigo spinner, bold loading label, and muted contextual helper copy.
- The completed state keeps the same sheet dimensions and adds the selected headword, pronunciation action, phonetic, part of speech, synonyms, Vietnamese meaning, definition, and bilingual example.
- A separate focused crop was not needed because the complete loading sheet region and all text remain legible in both source and implementation captures.

**Required fidelity surfaces**

- Fonts and typography: the existing application font stack, `18px` sheet title, compact loading copy, and clear detail hierarchy match the established lesson vocabulary sheet.
- Spacing and layout rhythm: the shared component preserves its `82dvh` stable height during loading and result states, `24px` top radius, sticky header, centered loader, and fixed close target.
- Colors and visual tokens: white surface, slate text, primary indigo actions, subtle separators, dim backdrop, and light-theme contrast follow the reference and existing product tokens.
- Image quality and asset fidelity: no custom imagery is required for this sheet; Lucide icons remain sharp at the tested mobile viewport.
- Copy and content: loading text matches the reference. The lookup request includes the selected word, full English subtitle sentence, and Vietnamese translation so the returned meaning is contextual.

**Comparison history**

1. The video transcript initially supported segment seeking only and had no vocabulary-detail interaction.
2. English subtitle tokens were converted into independent word buttons and connected to the existing lesson vocabulary lookup sheet without changing segment seeking.
3. Browser verification selected `compensate` and received the matching headword and contextual Vietnamese meaning; an uncached lookup showed the expected loading state before resolving successfully.
4. No actionable P0/P1/P2 visual or interaction differences remain for the requested scope.

**Interaction and technical checks**

- Opening a word pauses playback and opens the sheet immediately.
- Closing the sheet keeps the existing downward exit animation.
- Related-word lookups, pronunciation controls, retry handling, and stale-request protection remain wired through the shared component.
- Client production build, ESLint, TypeScript compilation, and all `68` backend tests pass.

### 20.1. Remove translated-status badges from recent videos

- Source state: Browser Comment 1 on `/dich-video` at a `355 x 602` viewport, targeting the violet `Đã dịch` pill in a recent-video card.
- Browser-rendered evidence: `C:\Users\DELL\AppData\Local\Temp\video-recent-without-translated-badge-qa.png` (`351 x 595px`), closely matching the annotated `355 x 602` viewport without density resampling.
- Implementation state: the status pill is removed from every recent-video card while thumbnail, duration, title, metadata, overflow menu, card spacing, and open-video behavior remain unchanged.
- Browser verification rendered two recent-video cards and found zero exact `Đã dịch` labels. The removed row collapses cleanly without leaving an empty gap or horizontal overflow.
- Fonts, colors, image crop, icons, and app-specific copy outside the requested badge are unchanged. No new image asset was required.
- Production client build, ESLint, and TypeScript compilation pass; browser console has no errors.

final result: passed

## 13. Speaking response loader

**Source visual truth**

- User reference: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-b3110dc1-e617-4bbc-a458-bd7a656047a9.png` (`166 x 63px`).
- The reference establishes a simple three-dot waiting indicator. Per the request, the implementation intentionally changes the dots from black to white and places them inside the existing purple response bubble.

**Implementation evidence**

- Final browser capture: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-response-loader-final.png` (`1580 x 889px`).
- Focused source/implementation comparison: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-response-loader-comparison.png` (`744 x 190px`).
- CSS viewport: `1404 x 790`; browser capture: `1580 x 889px` at device pixel ratio `1.125`.
- State: development-only isolated preview of the exact production loader component on the dark speaking surface.

**Required fidelity surfaces**

- Icon: the reload spinner is replaced with the existing Lucide `Ellipsis` icon, matching the reference's three filled circular dots.
- Color: all three dots render pure white (`rgb(255, 255, 255)`) against the existing violet response bubble.
- Motion: the dots use the existing Tailwind pulse animation. The animation is disabled when the operating system requests reduced motion; the verification browser reports `prefers-reduced-motion: reduce`, confirming that accessibility fallback.
- Layout: the existing compact left-aligned response bubble footprint, rounded shape, and violet color are preserved.
- Semantics: the indicator exposes `role="status"` and the Vietnamese accessible label `Đang chờ phản hồi`; the decorative icon is hidden from assistive technology.

**Comparison findings**

1. The focused comparison confirms the requested three-dot silhouette and spacing are preserved.
2. The requested white color inversion is applied without introducing a custom raster asset or CSS-drawn icon.
3. No actionable P0/P1/P2 visual differences remain for the requested scope.

final result: passed

## 16. Speaking practice history

**Source visual truth**

- Reference mockup: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-daba6ee4-d6b0-4893-808f-016e60c69238.png` (`852 x 1856px`).
- Target route: `/luyen-noi/lich-su`, with the existing application theme, real speaking-session data, no bottom navigation, and a guaranteed back action to `/luyen-noi`.

**Implementation evidence**

- Initial in-app Browser capture: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-history-implementation-initial.png` (`463 x 862px`).
- Combined reference/implementation comparison: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-history-comparison.png` (`944 x 1045px`).
- The initial browser capture used the user's active dark theme. It exposed a stale running backend process before the new route was loaded; the exact process was restarted and the endpoint now resolves through the normal authentication/guest-identity guard instead of returning 404.

**Findings and fixes**

- P1: the first capture showed `Cannot GET /api/speaking/history` because the already-running `ts-node` process had not loaded the new controller. Restarting only that verified project process fixed the runtime registration.
- P1: the hero headline wrapped to two lines and the hero/list rows were taller than the reference. The hero was reduced to `128px`, the title was constrained to one line, and list media was reduced to `70 x 64px` with tighter row spacing.
- P2: the first score treatment was a static border. It now uses a real conic progress ring driven by the calculated score, with matching green/orange/rose states and a separate unscored state.
- P2: the back button originally depended on browser history. It now returns directly to `/luyen-noi`, so direct entry and refresh still produce the expected navigation.

**Required fidelity surfaces**

- Typography and layout: centered navy title, circular header controls, pastel hero, four equal stat cards, horizontally scrollable filter chips, compact history cards, and bottom practice tip follow the reference hierarchy.
- Assets: the hero uses a project-bound generated raster illustration based on the supplied visual; scenario rows reuse the product's existing speaking artwork. All visible icons come from the existing Lucide icon system.
- Data and interaction: totals, average score, speaking streak, unique topics, duration, spoken-turn count, timestamps, and score labels are calculated from real speaking sessions. Category chips and the high-score filter update the list locally.
- Theme behavior: light mode follows the reference palette; dark mode uses neutral surfaces, reduced hero brightness, dark cards, and accessible violet/green/orange accents.
- Empty, loading, and error states are implemented so the new route remains complete for new guest accounts and interrupted requests.

**Technical checks**

- Production client build passes (`vite build`, 1717 modules).
- Independent backend TypeScript compilation passes with `tsconfig.build.json`.
- Speaking service test suite passes (`6/6`), including history aggregation, score averaging, duration totals, streak, and unique-topic statistics.
- The restarted backend recognizes `GET /api/speaking/history`; unauthenticated access reaches the normal authorization response rather than a missing-route response.

final result: passed

## 14. Premium homepage feature cards

**Source visual truth**

- Browser Comment 1 on `/`: redesign the four `Dành cho bạn` cards to match the attached premium 3D reference while keeping the existing product routes.
- Pre-change browser capture: `D:\Code\ShowdingEng\backend\output\design-qa\home-feature-cards-before.png` (`414 x 769px`).
- The attached target reference establishes the 2 x 2 layout, saturated blue/purple/teal/orange card families, right-aligned 3D subjects, left-aligned live copy, rounded corners, and white pill actions.

**Implementation evidence**

- Final browser capture: `D:\Code\ShowdingEng\backend\output\design-qa\home-feature-cards-after.png` (`414 x 769px`).
- Full before/after comparison: `D:\Code\ShowdingEng\backend\output\design-qa\home-feature-cards-full-comparison.png` (`846 x 769px`).
- Focused section comparison: `D:\Code\ShowdingEng\backend\output\design-qa\home-feature-cards-comparison.png` (`846 x 390px`).
- CSS viewport: `418 x 776`; source and implementation captures use the same browser density and were placed side by side without resampling.
- State: `/`, dark theme, 2-column mobile grid. The focused comparison excludes the independently rotating hero and account header, so those unrelated state differences do not affect the judgment.

**Generated asset additions**

- `client/public/images/home/listening-card.webp`: cobalt listening scene with headphones, music notes, and waveform.
- `client/public/images/home/vocabulary-card.webp`: violet vocabulary scene with an open book and colorful learning tiles.
- `client/public/images/home/speaking-card.webp`: teal speaking scene with a studio microphone, speech bubble, and sound ripples.
- `client/public/images/home/video-translation-card.webp`: orange video scene with a clapperboard, play symbol, and film-strip accents.
- The four final project assets are real generated raster illustrations, resized to `760 x 560px`, optimized to WebP, and approximately `19-25 KB` each.

**Full-view and focused comparison evidence**

- The four cards now occupy the same responsive 2-column structure but use the reference's larger `185 x 154px` proportions, stronger visual hierarchy, `22px` radii, and topic-specific full-bleed artwork.
- Copy and white pill actions remain on the reserved dark left side of each illustration; the primary 3D object remains on the right and stays recognizable at the final mobile size.
- Browser inspection confirms all four images load completely at `760 x 560px`, all four cards have equal dimensions, and the document has zero horizontal overflow.
- The focused comparison shows the new cards are substantially closer to the attached reference without changing adjacent homepage sections.

**Required fidelity surfaces**

- Fonts and typography: the app's existing sans-serif family is preserved; `17px` extra-bold titles, compact `10px` supporting text, and `10px` bold CTA labels remain readable without clipping or awkward wrapping.
- Spacing and layout rhythm: the existing `16px` page gutter is preserved; cards use a consistent `12px` grid gap, `154px` height, `14px` internal padding, `22px` radius, and balanced two-row rhythm.
- Colors and visual tokens: the blue, violet, teal, and orange families match the reference art direction; white content and CTA surfaces preserve contrast on the dark homepage.
- Image quality and asset fidelity: all four visible illustrations are dedicated optimized raster assets generated for the measured card slot; there are no placeholders, CSS drawings, stretched crops, text artifacts, or visible compression halos.
- Copy and content: Vietnamese titles, concise learning outcomes, and action labels are live UI text; the existing destinations remain `/kham-pha`, `/tu-vung`, `/luyen-noi`, and `/dich-video`.

**Comparison history**

1. The pre-change cards used small centered illustrations with a bottom label strip and did not match the reference's full-bleed premium composition. This was the requested P1 fidelity gap.
2. Four coordinated 3D illustrations were generated, visually inspected, optimized, and integrated with live text and responsive link behavior.
3. The first browser pass found a P2 contrast mismatch: the global dark-theme `.bg-white` override rendered the CTA pills dark. The CTA surface was changed to an explicit `#ffffff` token.
4. The final browser comparison confirms white action pills, correct crops, equal card geometry, and no remaining actionable P0/P1/P2 mismatch.

**Interaction and technical checks**

- Clicking `Từ vựng: Học ngay` successfully opens `/tu-vung`, and browser back returns to `/` without a full-page navigation error.
- Production client build passes.
- Browser console reports no errors.
- `git diff --check` reports no whitespace errors; existing line-ending notices are informational only.

final result: passed

## 13. Home vocabulary discovery carousel

**Source visual truth**

- User attachment: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-ea24600f-5226-48db-9fb4-73207a52d2da.png` (`407 x 278px`).
- Target state: light theme, “Khám phá bộ từ vựng” directly below “Bài nghe nổi bật”, first three vocabulary covers visible in a horizontally scrollable row.

**Implementation evidence**

- Light full-view capture: `D:\Code\ShowdingEng\backend\design-qa-artifacts\home-vocabulary-light.png` (`414 x 769px`).
- Dark full-view capture: `D:\Code\ShowdingEng\backend\design-qa-artifacts\home-vocabulary-dark.png` (`414 x 769px`).
- Normalized focused implementation crop: `D:\Code\ShowdingEng\backend\design-qa-artifacts\home-vocabulary-light-crop.png` (`407 x 278px`).
- Side-by-side focused comparison, source left / implementation right: `D:\Code\ShowdingEng\backend\design-qa-artifacts\home-vocabulary-comparison.png` (`824 x 278px`).
- CSS viewport: `418 x 776`; browser-reported device pixel ratio: `1.125`. The implementation screenshot is emitted by the browser backend at `414 x 769px`; the focused comparison uses a direct `407 x 278px` crop without density resampling.
- State: vocabulary overview loaded, first carousel position, both light and dark themes verified.

**Full-view and focused comparison evidence**

- The new section sits immediately below the featured-listening carousel and before “Chủ đề phổ biến”.
- The focused side-by-side comparison confirms matching hierarchy, `120px` cover height, compact white metadata panel, `12px` radius, subtle shadow, title placement, word count, learned count, and a partially visible third card.
- The first three cards use the exact production cover assets for Common 1000, Basic Travel, and Daily Conversation. No placeholders or code-drawn artwork are used.
- Dark mode keeps the same geometry and artwork while switching the card, border, type, and page tokens to the existing application theme.

**Required fidelity surfaces**

- Fonts and typography: existing product sans-serif is retained; section title, “Xem tất cả”, one-line card titles, and compact metadata match the source hierarchy and do not shift card height.
- Spacing and layout rhythm: `16px` section inset, `12px` card gap, `132px` card width, `120px` cover, `76px` metadata area, `12px` radius, and stable initial scroll position reproduce the reference density.
- Colors and visual tokens: the light state uses the reference white/slate/indigo balance; dark mode uses the application’s neutral surfaces and existing indigo accent.
- Image quality and asset fidelity: all visible covers are optimized WebP assets with the correct topic, crop, scale, and sharpness; no stretching, halos, or fallback graphics are visible.
- Copy and content: “Khám phá bộ từ vựng”, “Xem tất cả”, vocabulary titles, live word counts, and learned counts are preserved.

**Comparison history**

1. The first implementation matched the card proportions but allowed the carousel to advance automatically, so the initial view could drift away from the three source cards. This was a P2 state-fidelity issue.
2. Automatic advancement was removed and the shared horizontal-scroll component received an opt-in `startAtBeginning` behavior for this carousel.
3. Card titles initially wrapped to two lines in the production build. They were tightened to a single-line `11px` treatment so the metadata rhythm matches the source.
4. Post-fix light and dark captures show no actionable P0/P1/P2 differences. The source browser-scrollbar strip and small capture-width difference are environmental rather than component drift.

**Interaction and technical checks**

- Horizontal browsing was exercised and the carousel reliably reopens at the first card.
- “Xem tất cả” navigates to `/tu-vung`; browser Back returns to `/`.
- Production client build passes.
- Browser console reports no errors in the final state.

final result: passed

## 8. Registration box sizes matched to login

**Source visual truth**

- Registration reference: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-3e26e479-87b2-4857-ba93-38bb58d741da.png` (`450 x 542px`).
- Login size reference: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-4e3be2df-b1d8-4c34-8bfc-ad9500b3484b.png` (`450 x 456px`).
- User requirement: registration inputs, primary CTA, and Google CTA must use the same box dimensions as their login equivalents.

**Implementation evidence**

- Rendered login reference: `D:\Code\ShowdingEng\backend\output\design-qa\login-box-reference.png` (`418 x 776px`).
- Rendered registration implementation: `D:\Code\ShowdingEng\backend\output\design-qa\register-box-matched.png` (`418 x 776px`).
- Same-viewport comparison, login on the left and registration on the right: `D:\Code\ShowdingEng\backend\output\design-qa\auth-box-size-comparison.jpg` (`836 x 776px`).
- CSS viewport: `418 x 776`; browser-reported device pixel ratio: `1.125`; screenshots were captured at `418 x 776px`, so no density resampling was applied.
- State: empty authentication forms, light authentication theme, no validation or loading state.

**Full-view and focused comparison evidence**

- Login inputs: approximately `369.78 x 51px`; all four registration inputs: approximately `369.78 x 51px`.
- Login primary CTA and registration primary CTA: approximately `369.78 x 50px`.
- Login Google CTA and registration Google CTA: approximately `369.78 x 50px`.
- All compared boxes use the same `9px` border radius. The same-viewport composite confirms the registration screen still fits without horizontal overflow or clipped controls.
- A separate focused crop was unnecessary because every affected box is clearly visible at 1:1 scale in the side-by-side `836 x 776px` comparison, and browser-computed dimensions provide exact evidence.

**Required fidelity surfaces**

- Fonts and typography: the existing route-specific input and Google-label font sizes remain unchanged; primary CTA labels remain `18px`. The request only changes box geometry.
- Spacing and layout rhythm: registration box heights now match login exactly while existing registration gaps, agreement row, and section margins remain unchanged.
- Colors and visual tokens: borders, backgrounds, blue-violet CTA treatment, radii, and shadows remain unchanged.
- Image quality and asset fidelity: the existing HiHiEnglish wordmark, Google icon, field icons, and CTA raster asset remain production assets and render sharply.
- Copy and content: all login and registration labels, placeholders, agreement copy, and footer links remain unchanged.

**Comparison history**

1. Registration inputs measured `45px`, while login inputs measured `51px`; registration primary and Google CTAs measured `46px`, while login equivalents measured `50px`. This was the requested P2 consistency mismatch.
2. Registration-specific height rules were updated to `51px` for inputs and `50px` for both CTA boxes.
3. Post-fix browser evidence confirms exact width, height, and radius parity for all requested boxes. No actionable P0/P1/P2 differences remain.

**Technical checks**

- Production client build passes.
- Browser console reports no errors in the verified registration state.
- Registration has no horizontal overflow at the verified viewport.
- No form submission or account data transmission occurred during QA.

final result: passed

## 7. Primary authentication button text — 18px

**Source visual truth**

- Login button crop: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-6946509b-cde5-42d7-8187-eee06585486d.png` (`437 x 98px`).
- Registration button crop: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-6e0a8e3f-9dca-4bd0-ba01-9a1d2cffd030.png` (`423 x 69px`).
- The user's quantitative requirement is the source of truth: both primary CTA labels must render at `18px`.

**Implementation evidence**

- Login screen: `D:\Code\ShowdingEng\backend\output\design-qa\login-18px.png` (`418 x 776px`).
- Registration screen: `D:\Code\ShowdingEng\backend\output\design-qa\register-18px.png` (`418 x 776px`).
- Focused login comparison, source on the left and implementation on the right: `D:\Code\ShowdingEng\backend\output\design-qa\login-button-comparison.png` (`855 x 98px`).
- Focused registration comparison, source on the left and implementation on the right: `D:\Code\ShowdingEng\backend\output\design-qa\register-button-comparison.png` (`841 x 69px`).
- CSS viewport: `418 x 776`; browser-reported device pixel ratio: `1.125`; capture output: `418 x 776px`, so no density resampling was applied.
- State: empty login and registration forms, light authentication theme, no loading or validation state.

**Full-view and focused comparison evidence**

- Browser computed styles confirm `.account-auth-primary` renders at `18px`, weight `600`, and line-height `27px` on both `/dang-nhap` and `/dang-ky`.
- The login CTA measures approximately `369.78 x 50px`; the registration CTA measures approximately `369.78 x 46px`. Existing geometry is intentionally preserved.
- Focused comparisons confirm the label remains centered and the existing blue-violet raster treatment, radius, shadow, and white foreground remain unchanged.

**Required fidelity surfaces**

- Fonts and typography: both primary CTA labels now use the requested `18px` size with the existing font family, `600` weight, and centered alignment.
- Spacing and layout rhythm: button dimensions, margins, radii, and surrounding form spacing are unchanged.
- Colors and visual tokens: the existing blue-violet background asset, white text, and shadow are unchanged.
- Image quality and asset fidelity: the production CTA raster asset remains in use and renders without visible distortion.
- Copy and content: “Đăng nhập” and “Đăng ký tài khoản” are unchanged.

**Comparison history**

1. The shared primary CTA rule rendered the login label at `20px`; registration already overrode it to `18px`.
2. The shared rule was changed to `18px`, aligning both routes without duplicating route-specific CSS.
3. Post-fix browser evidence confirms both CTA labels compute to exactly `18px`; no actionable P0/P1/P2 differences remain for the requested change.

**Technical checks**

- Production client build passes.
- Browser console reports no errors in the verified authentication states.
- Route navigation between registration and login was checked; no form submission or account data transmission occurred.

final result: passed

## 9. Vocabulary-set book-cover card

**Source visual truth**

- Browser Comment 1 additional attachment: the compact Oxford 5000 vocabulary card shown in the current conversation; the attachment renderer did not expose a local filesystem path.
- Displayed source reference: approximately `151 x 229px`, with a dark academic cover above a compact white metadata panel.
- Normalized HiHiEnglish cover asset derived from that visual direction: `D:\Code\ShowdingEng\backend\client\public\images\vocabulary\common-1000-cover.png` (`1319 x 1192px`).
- Target characteristics: narrow portrait card, `12px` radius, academic navy cover, oversized word-count hierarchy, title below the cover, and a small two-item statistics row.

**Implementation evidence**

- Full rendered vocabulary state: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-book-card-final.png` (`418 x 776px`).
- Focused final card crop: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-book-card-crop.png` (`146 x 220px`).
- Cover-to-card comparison, normalized cover on the left and final implementation on the right: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-book-card-comparison.png` (`304 x 220px`).
- CSS viewport: `418 x 776`; browser-reported device pixel ratio: `1.125`; screenshot output remained `418 x 776px`, so no density resampling was applied to the implementation capture.
- State: `/tu-vung`, dark theme, vocabulary overview loaded, zero learned words, horizontal discovery row at its initial position.

**Full-view and focused comparison evidence**

- The selected card measures `146 x 219.78px` with a `12px` radius, closely matching the narrow source proportions.
- The card now uses a distinct `132px` cover area and an `86px` metadata panel instead of the former icon-first dashboard card.
- The focused comparison confirms the HiHiEnglish wordmark, large “1000”, “TỪ THÔNG DỤNG”, title, word count, and learned count remain fully visible at thumbnail size.
- Other vocabulary sets use the same book-cover structure while retaining their existing topic color and icon. The horizontal browsing behavior remains unchanged.

**Required fidelity surfaces**

- Fonts and typography: the cover uses a real generated raster asset for the display lettering; metadata uses the existing product sans-serif at compact `12px/16px` sizing with two-line clamping.
- Spacing and layout rhythm: `146px` width, `132px` cover, `86px` metadata panel, `12px` radius, and compact statistics spacing reproduce the reference density without horizontal page overflow.
- Colors and visual tokens: the featured cover uses the requested academic navy and white treatment; the metadata panel adapts to the application's existing dark theme.
- Image quality and asset fidelity: the featured cover is a dedicated high-resolution raster asset rather than CSS or placeholder art. It loads at `1319 x 1192px` and renders sharply in the `146 x 132px` slot.
- Copy and content: the production set title, `1000` word count, A1 data, learned count, and opening behavior remain intact.

**Comparison history**

1. The previous card was a wide `168px` dashboard tile with a rounded icon, level pill, long description, and `22px` radius. This was the primary P1 mismatch against the supplied book-cover reference.
2. The first implementation introduced the correct cover-and-metadata structure, but the original portrait cover was cropped inside the landscape cover slot and partially hid the HiHiEnglish wordmark. This was a P2 image-fit issue.
3. The cover asset was recomposed specifically for the `146 x 132px` slot, removing the unused lower panel and keeping every cover element visible.
4. Post-fix visual evidence shows no actionable P0/P1/P2 differences for the requested card redesign.

**Interaction and technical checks**

- The featured card remains a semantic button with a descriptive accessible name.
- Clicking the card successfully opens the 1000-word set detail view.
- Production client build passes.
- Browser console reports no errors and the page has no horizontal overflow in the verified state.

final result: passed

## 10. Topic-specific vocabulary cover images

**Source visual truth**

- Browser Comment 1 on `/tu-vung`: each vocabulary topic should have a corresponding image instead of a generic color-and-icon cover.
- Pre-change rendered state: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-book-card-final.png` (`414 x 769px` capture). It shows the dedicated 1000-word cover beside generic fallback covers for Travel and Daily Conversation.
- Target art direction: retain the compact book-cover card structure from section 9 while giving each of the eight visible sets a distinct, instantly recognizable full-bleed illustration.

**Implementation evidence**

- Initial discovery-row state: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-topic-covers-final.png` (`414 x 769px`).
- Horizontally scrolled state covering Technology, Education, and Economics: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-topic-covers-later.png` (`414 x 769px`).
- Full before/after comparison: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-topic-covers-comparison.jpg` (`828 x 769px`).
- Focused discovery-row comparison: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-topic-covers-focused-comparison.jpg` (`828 x 290px`).
- CSS viewport: `418 x 776`; browser-reported device pixel ratio: `1.125`. Browser captures are `414 x 769px`; no density resampling was applied to either side of the comparison.
- State: `/tu-vung`, dark theme, authenticated vocabulary overview. Learned-count differences between source and implementation are dynamic user data and are not part of the requested visual change.

**Generated asset set**

- `common-1000-cover.webp`: existing HiHiEnglish academic cover, now optimized for delivery.
- `travel-basic-cover.webp`: airplane, world map, luggage, and route markers.
- `daily-conversation-cover.webp`: two people speaking with colorful speech bubbles.
- `office-work-cover.webp`: laptop, briefcase, documents, lamp, and checklist.
- `movies-entertainment-cover.webp`: clapperboard, film reel, popcorn, and cinema star.
- `technology-cover.webp`: processor, circuits, cloud, phone, and AI orb.
- `education-cover.webp`: open book, graduation cap, pencil, and globe.
- `economics-cover.webp`: coins, rising chart, globe, and growth arrow.
- All eight production assets are `584 x 528px` WebP files. The seven new images are approximately `21–35 KB` each.

**Full-view and focused comparison evidence**

- The focused comparison confirms that the Travel and Daily Conversation subjects replace the generic number/icon blocks without changing card size, metadata placement, or horizontal browsing behavior.
- The later-state capture confirms that Technology, Education, and Economics remain distinct and legible at the far end of the horizontal row.
- Browser inspection confirms all eight cover images are complete, each has a natural size of `584 x 528px`, and each renders at approximately `144.22 x 132px` inside its card.
- The page has zero horizontal document overflow; overflow remains intentionally contained within the discovery carousel.

**Required fidelity surfaces**

- Fonts and typography: metadata typography, title wrapping, weights, and statistics labels are unchanged; no generated image contains unintended text.
- Spacing and layout rhythm: the existing `146px` card width, `132px` cover area, `86px` metadata panel, radius, and section spacing remain unchanged.
- Colors and visual tokens: every illustration uses the existing dark product palette with a topic-specific accent family; the black metadata panel continues to provide consistent contrast.
- Image quality and asset fidelity: all topic visuals are dedicated raster assets, share one polished 3D editorial language, use a source aspect ratio that exactly matches the cover slot, and render without stretching, halos, or soft thumbnail crops.
- Copy and content: production topic names, word counts, CEFR levels, learned counts, and set-opening behavior remain unchanged.

**Comparison history**

1. The pre-change UI used a dedicated raster cover only for `1000 Từ thông dụng`; the other visible sets used generic solid-color icon/number panels. This was the requested P1 content-fidelity gap.
2. Seven topic-specific illustrations were generated, visually inspected, resized to `584 x 528px`, and optimized to WebP before integration.
3. Post-fix source/implementation comparison shows the new artwork fits the existing card structure with no actionable P0/P1/P2 mismatch. No additional visual correction loop was required.

**Interaction and technical checks**

- Clicking `Du lịch cơ bản` successfully opens its 150-word detail view.
- Production client build passes.
- Browser console reports no errors.
- All eight mapped images load successfully, and the fallback cover remains available for future unmapped sets.

final result: passed

## 11. Topic thumbnails in “Bộ từ của bạn”

**Source visual truth**

- Browser Comment 1 on `/tu-vung`: saved vocabulary-set rows should display the corresponding topic image.
- Pre-change browser capture: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-topic-covers-final.png` (`414 x 769px`). The saved rows use generic topic icons even though matching covers already exist above.
- Scope is limited to the leading visual in each saved-set row; card geometry, labels, statistics, and navigation remain unchanged.

**Implementation evidence**

- Post-change browser capture: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-my-sets-topic-images-final.png` (`414 x 769px`).
- Full before/after comparison: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-my-sets-topic-images-comparison.jpg` (`828 x 769px`).
- Focused saved-row comparison: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-my-sets-topic-images-focused-comparison.jpg` (`828 x 335px`).
- CSS viewport: `418 x 776`; browser capture output: `414 x 769px`; both sides use the same capture density and require no resampling.
- State: `/tu-vung`, dark theme, authenticated overview with Travel, Technology, and Office Work saved.

**Full-view and focused comparison evidence**

- Travel, Technology, and Office Work now show their matching generated cover artwork in the existing `44 x 44px` leading slot.
- Browser inspection confirms all three thumbnails load completely from their mapped WebP files, each with a natural size of `584 x 528px` and a rendered size of `44 x 44px`.
- The fallback icon remains available for future saved sets that do not have a mapped cover.
- The card row size, text alignment, chevron position, and vertical rhythm are visually unchanged.

**Required fidelity surfaces**

- Fonts and typography: titles, counts, CEFR labels, learned-count copy, font weights, and truncation are unchanged.
- Spacing and layout rhythm: the original `44px` visual slot, `16px` card padding, row gaps, radius, shadow, and alignment are preserved.
- Colors and visual tokens: existing card and text tokens remain unchanged; each thumbnail inherits its topic palette from the generated cover.
- Image quality and asset fidelity: thumbnails use the real topic assets with centered `object-cover` cropping and render without distortion, blank space, or visible compression artifacts.
- Copy and content: all saved-set names, word counts, CEFR levels, learned counts, and navigation behavior remain intact.

**Comparison history**

1. The pre-change saved-set rows used generic Lucide icons instead of the already available topic cover artwork. This was the requested P1 content-fidelity gap.
2. The shared slug-to-cover mapping was reused for saved rows, with the existing icon retained only as a fallback.
3. Post-change visual comparison shows no actionable P0/P1/P2 differences for the requested scope.

**Interaction and technical checks**

- Clicking the saved `Du lịch cơ bản` row successfully opens its personal progress/detail view.
- Production client build passes.
- Browser console reports no errors, and the page has zero horizontal document overflow.

final result: passed

## 19. Video translation landing-screen redesign

**Source visual truth**

- Reference mockup: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-a2dc8322-0484-41d9-a18f-531038002a7d.png`.
- Target state: `/dich-video`, light theme, Link video selected, recent translated video visible.

**Implementation evidence**

- The reference and browser-rendered implementation were normalized to the same mobile app width and compared side by side.
- A dedicated generated raster asset is used for the purple 3D clapperboard hero artwork.
- The existing URL submission, file upload, quota, processing, recent-job open, and recent-job delete flows remain connected to their production API handlers.

**Required fidelity surfaces**

- Header, segmented mode control, lavender hero, feature row, inline link form, recent-video card, tip panel, and page-specific bottom navigation follow the reference hierarchy.
- Typography remains within the existing product font stack while matching the reference's navy headings, compact support copy, and violet actions.
- The page has no horizontal overflow, the upload tab and recent-video menu are interactive, and the browser console reports no errors.
- The production client build completes successfully.

final result: passed

## 17. Remove the CEFR badge from speaking-history rows

**Source visual truth**

- User-annotated browser state: `/luyen-noi/lich-su`, dark theme, `510 x 784` CSS viewport, with the `A2` badge shown after the `Hằng ngày` category badge.
- Pre-change browser capture: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-history-level-badge-before.png` (`507 x 778px`).

**Implementation evidence**

- Final browser capture: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-history-level-badge-after.png` (`507 x 778px`).
- Full-view comparison: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-history-level-badge-comparison.png` (`1034 x 778px`).
- Focused first-row comparison: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-history-level-badge-focused-comparison.png` (`982 x 130px`).
- Browser viewport: `510 x 784` CSS pixels at device pixel ratio `1.125`; before and after captures use identical dimensions and state.

**Required fidelity surfaces**

- Fonts and typography: the scenario title, category badge, timestamps, duration, turn count, score, and score label retain their existing sizes, weights, and line heights.
- Spacing and layout rhythm: removing the level badge lets the title row use the freed horizontal space without changing the card grid, image slot, score ring, padding, radius, or vertical rhythm.
- Colors and visual tokens: the dark card surface and the existing fuchsia category badge remain unchanged; only the indigo CEFR badge is removed.
- Image quality and asset fidelity: scenario artwork, crop, sharpness, and sizing are unchanged.
- Copy and content: the `A2` label is absent from every rendered history row, while the scenario title and category label remain visible.

**Comparison history**

1. The source state included a redundant `A2` pill next to the category pill on each history card.
2. The CEFR pill was removed from the shared history-row renderer.
3. The post-change DOM contains 15 history rows and no visible `A2` text; the focused comparison shows no unintended movement outside the title-row content.

**Interaction and technical checks**

- History data reloads successfully and all 15 rows render.
- Browser console reports no warnings or errors.
- Production client build and backend TypeScript compilation pass.

final result: passed

## 13. Scenario-specific artwork and colors for 50 speaking lessons

**Source visual truth**

- The content catalog in `src/speaking/speaking-scenarios.ts` defines 50 new level-specific speaking lessons: 10 each for A1, A2, B1, B2, and C1.
- Each lesson supplies a scenario slug, title, description, category, and color token. These fields are the source of truth for selecting both the illustration and the card palette.

**Implementation evidence**

- Contact sheet: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-50-scenario-images-contact-sheet.png`.
- A2 browser capture: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-new-images-a2-scroll.png`.
- Final asset directory: `D:\Code\ShowdingEng\backend\client\public\images\speaking\scenarios`.
- All 50 assets are optimized `640 x 480px` WebP illustrations, grouped evenly across the five CEFR levels and totaling approximately 1.73 MB.

**Required fidelity surfaces**

- Scenario relevance: every lesson has a distinct illustration that depicts its own conversational setting, including classroom greetings, transport, shopping, healthcare, workplace presentations, negotiations, public speaking, and advanced policy discussions.
- Visual consistency: all assets use a premium soft 3D clay-render style, clear central composition, safe card padding, and no readable text, logos, watermarks, borders, or embedded interface controls.
- Colors: `SpeakingPage.tsx` maps backend color tokens to matching tint and accent pairs. Light mode uses the scenario tint on card surfaces; dark mode preserves the dark surface while retaining the assigned accent color and scenario-specific artwork.
- Image quality: the 4:3 images use `object-cover` without stretching and remain recognizable at the compact mobile card size.

**Interaction and technical checks**

- All 50 public image URLs return HTTP 200.
- Browser inspection confirms all 10 A2 and all 10 C1 generated images load completely with a natural size of `640 x 480px`.
- Expanding the scenario list and changing CEFR levels continue to work without horizontal overflow.
- Production client build passes, and `git diff --check` reports no whitespace errors.

final result: passed

## 15. Speaking selection redesign and level-specific scenario catalog

**Source visual truth**

- Reference mockup: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-ed4b66bb-c25e-4a36-b9c2-875533ee7f8c.png` (`863 x 1822px`).
- Target state: `/luyen-noi`, light theme, A1 selected, all categories selected, six scenario cards visible.
- The reference was normalized to `507 x 1080px` so its pixel dimensions match the browser-rendered implementation capture.

**Implementation evidence**

- Browser-rendered implementation: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-redesign-after-507x1080-final.png` (`507 x 1080px`).
- Normalized reference: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-redesign-reference-507x1080.png` (`507 x 1080px`).
- Full side-by-side comparison: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-redesign-comparison-507x1080-final.png` (`1038 x 1080px`).
- Focused scenario-grid comparison: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-redesign-focused-cards-final.png` (`1038 x 570px`).
- Browser CSS viewport: approximately `460 x 972`; output capture: `507 x 1080px`. The source was resampled directly to the output capture dimensions to remove density mismatch.

**Findings**

- No actionable P0/P1/P2 differences remain.
- The generated hero preserves the source subject, pose, microphone, headset, palette, and right-aligned composition. The source-only speech bubble and status bar are intentionally omitted because the page runs inside the existing product shell; this is acceptable P3 drift.
- The implementation keeps the product's persistent bottom navigation, which is absent from the standalone mockup but required for consistency with the rest of the application.
- Scenario titles and descriptions use production catalog copy rather than the illustrative text in the mockup; hierarchy, card density, and interaction affordances remain faithful.

**Required fidelity surfaces**

- Fonts and typography: the implementation matches the bold navy hierarchy, compact level labels, readable two-line card titles, small supporting copy, and truncation behavior. No broken wrapping or clipped display text was found.
- Spacing and layout rhythm: hero proportions, rounded white content sheet, five-column level selector, five filter chips, three-column card grid, section gaps, radii, and shadows closely follow the reference. The document has no horizontal overflow.
- Colors and visual tokens: the pale lavender hero, navy foreground, level accents, violet selected states, pastel card tints, and soft borders map consistently to the source palette.
- Image quality and asset fidelity: the page uses generated raster artwork for the hero, six scenario families, and trophy tip card. Crops fit their slots without stretching, transparency halos, or placeholder graphics.
- Copy and content: Vietnamese labels, CEFR levels, category filters, scenario descriptions, time labels, roles, and actions are complete. The backend catalog now contains 50 new level-specific scenarios: exactly 10 each for A1, A2, B1, B2, and C1.

**Comparison history**

1. Initial full-view comparison used a shorter default browser viewport and made the scenario grid appear less dense than the reference; this was a normalization mismatch rather than a layout defect.
2. The implementation was recaptured at a source-equivalent aspect ratio, the source was normalized to the same `507 x 1080px`, and the level selector was aligned to the A1/collapsed state.
3. Changing CEFR level previously retained the expanded “Xem tất cả” state. The level interaction was updated to collapse the list, then recaptured. The post-fix comparison shows no remaining P0/P1/P2 issue.

**Interaction and technical checks**

- API returns 60 scenarios total: the 10 existing scenarios plus 50 new scenarios.
- Automated catalog tests verify exactly 10 new scenarios for every requested level and unique slugs/sort orders (`11/11` tests passed across the speaking suites).
- Browser check on A2 showed 10 `a2-` scenarios in the expanded list; browser check on C1 showed 10 `c1-` scenarios, including the final four catalog entries.
- The Học tập filter correctly reduced A2 to its matching study scenario, and switching level now resets the expanded list.
- Production client build and independent backend TypeScript compilation pass. The browser console reports no warnings or errors.
- The page has no horizontal overflow at the tested mobile viewport.

final result: passed

## 12. Topic thumbnails in “Tất cả bộ từ vựng”

**Source visual truth**

- Browser Comment 1 on the all-set view: every vocabulary-set row should load its corresponding topic image.
- Top pre-change capture: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-all-sets-topic-images-before-top.png` (`414 x 769px`).
- Bottom pre-change capture: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-all-sets-topic-images-before.png` (`414 x 769px`).
- The source state uses generic icons in the `48 x 48px` leading visual slot. The requested change is limited to replacing that visual with topic artwork.

**Implementation evidence**

- Top final capture: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-all-sets-topic-images-final-top.png` (`414 x 769px`).
- Bottom final capture: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-all-sets-topic-images-final-bottom.png` (`414 x 769px`).
- Top before/after comparison: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-all-sets-topic-images-top-comparison.jpg` (`828 x 769px`).
- Bottom before/after comparison: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-all-sets-topic-images-bottom-comparison.jpg` (`828 x 769px`).
- Focused top-card comparison: `D:\Code\ShowdingEng\backend\output\design-qa\vocabulary-all-sets-topic-images-focused-comparison.jpg` (`828 x 500px`).
- CSS viewport: `418 x 776`; source and implementation captures are `414 x 769px` at the same browser density, so no density resampling was required.
- State: `/tu-vung`, dark theme, “Tất cả bộ từ vựng” open, empty search query.

**Generated asset additions**

- `business-cover.webp`: business partners, handshake, briefcase, presentation board, and growth motif.
- `banking-cover.webp`: classical bank, secure vault, blank payment card, and protection shield.
- `finance-cover.webp`: balanced scale, pie chart, neutral coins, blank calculator, and trend motif.
- The built-in image-generation path produced the raster sources. Each final project asset was resized to `584 x 528px` and optimized to WebP at approximately `22–30 KB`.

**Full-view and focused comparison evidence**

- All 11 rows now show the image mapped to the row’s slug, including the newly covered Business, Banking, and Finance sets.
- Browser inspection confirms 11/11 images load completely, each with a natural size of `584 x 528px` and a rendered size of `48 x 48px`.
- The focused comparison confirms the image replacement does not shift titles, CEFR pills, descriptions, metadata, or chevrons.
- The bottom comparison confirms the three newly generated covers remain distinct and recognizable at thumbnail size.

## 18. Speaking-session summary redesign

**Source visual truth**

- User reference: `C:\Users\DELL\AppData\Local\Temp\codex-clipboard-91320086-b145-4b0c-930a-d990d1081511.png` (`1023 x 1537px`).
- Requested adaptation: preserve the dark navy celebration layout, overall score card, three skill cards, and action hierarchy while omitting the entire `Nhận xét của AI` section.

**Implementation evidence**

- Final browser capture: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-summary-final.png` (`1600 x 900px`), with the production summary component rendered in a `512px` mobile column.
- Source/implementation comparison: `D:\Code\ShowdingEng\backend\output\design-qa\speaking-summary-comparison.png` (`1995 x 1200px`).
- The comparison normalizes the source from `1023px` to `512px` wide next to the implementation at the same `512px` CSS width; no density-based judgment is made from the surrounding QA canvas.
- State: completed `Nhà hàng` A2 session, overall `86`, fluency `94`, grammar `80`, vocabulary `70`, and one completed speaking turn.

**Full-view and focused comparison evidence**

- The combined comparison is both the full-view and focused evidence: both `512px` columns retain readable score typography, labels, artwork, card boundaries, and action copy without downscaling below the mobile target width.
- A separate focused crop was not required because all critical typography and iconography remain legible in the normalized side-by-side capture.

**Required fidelity surfaces**

- Fonts and typography: the implementation preserves the bold centered title, large `86/100` hierarchy, compact skill scores, Vietnamese labels, and strong action-button typography using the application's existing font stack.
- Spacing and layout rhythm: the header, hero score card, three equal skill cards, primary action, and paired secondary actions follow the reference order and compact mobile rhythm. Removing the AI feedback card intentionally brings the action group directly below the skill cards.
- Colors and visual tokens: the dark navy surface, indigo/violet score card, emerald/sky/violet metric accents, white text, muted slate copy, and violet-to-blue primary action match the source palette.
- Image quality and asset fidelity: `client/public/images/speaking/summary-hero.png` is a dedicated generated 3D raster asset with the celebratory headset character, circular indigo glow, stars, and embedded `Great job!` bubble. It is not recreated with CSS or inline SVG.
- Copy and content: the title, scenario/level line, score labels, turn count, and three action labels match the requested screen. `Nhận xét của AI` and all of its child content are absent from the rendered DOM.

**Comparison history**

1. First pass: the hero and metric cards were materially taller than the reference, and the vocabulary score `70` was labeled `Tốt` instead of `Khá` (P2).
2. Fix: the hero was reduced from `292px` to `240px`, metric cards from `142px` to `118px`, action heights were tightened, and score-label thresholds were aligned to the reference.
3. Second pass: the generated `Great job!` bubble was clipped by centered `object-cover` cropping (P2).
4. Fix: the asset was regenerated with a smaller embedded bubble and the hero crop was anchored to the top. The final comparison shows the bubble, face, headset, thumb, score, and progress row without clipping.

**Interaction and technical checks**

- The summary exposes exactly three enabled next-step actions: choose another scenario, retry the same scenario, and return home.
- The production screen wires the back and choose-another actions to session reset, retry to a new session for the completed scenario, and home to `/`.
- Browser console reports no warnings or errors, and the final DOM does not contain `Nhận xét của AI`.

final result: passed

**Required fidelity surfaces**

- Fonts and typography: the existing title, CEFR, description, and metadata typography, line clamping, weights, and hierarchy remain unchanged.
- Spacing and layout rhythm: the original `48px` leading slot, `16px` card padding, `12px` card gap, row height, radius, and sticky header are preserved.
- Colors and visual tokens: existing card, text, search, and navigation tokens are unchanged; topic palettes now come from the corresponding artwork.
- Image quality and asset fidelity: all topic visuals are real optimized raster assets with centered `object-cover` cropping; no stretched images, blank spaces, or visible compression artifacts were found.
- Copy and content: all 11 titles, CEFR levels, descriptions, word counts, learned counts, and navigation behavior remain unchanged.

**Comparison history**

1. The pre-change all-set view used generic Lucide icons for every row. This was the requested P1 content-fidelity gap.
2. The existing eight covers were reused, and three matching covers were generated for Business, Banking, and Finance so the entire 11-set catalog is covered.
3. Post-change top, bottom, and focused comparisons show no actionable P0/P1/P2 differences for the requested scope.

**Interaction and technical checks**

- Search filtering was checked with “Kinh doanh” and returned matching catalog rows.
- Clicking `1000 Từ thông dụng` successfully opens its detail view.
- Production client build passes.
- Browser console reports no errors, and the page has zero horizontal document overflow.

final result: passed
