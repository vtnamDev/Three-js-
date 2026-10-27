# PELAGIC — THE DEEP DESCENT

Trải nghiệm đại dương 3D điện ảnh điều khiển bằng thao tác cuộn trang (`scroll` / `touch` / bàn phím), đưa người xem lặn theo một cá thể cá đại dương bơi liên tục qua **8 tầng độ sâu** từ mặt nước ngập nắng (`0 m`) xuống đáy vực thẳm **Hadal (`10.920 m`)**.

---

## Kiến trúc kỹ thuật chính

- **Stack:** Vite + React 19 + TypeScript + Three.js (`THREE.WebGLRenderer` đơn nhất, một vòng lặp render duy nhất).
- **Mô hình cá 3D & chuyển động sinh học (`src/lib/fishSwim.ts`):**
  - Sử dụng `public/assets/fish/barramundi-hero.glb` (**CC0-1.0**, PBR đầy đủ: `baseColor` có kênh alpha vây trong mờ, `metallicRoughness` + `AO`, `normalMap`).
  - Khâu tự động vào hệ xương **10-bone `THREE.Skeleton` (`THREE.SkinnedMesh`)** gồm 8 đốt sống dọc thân (`Head` → `CaudalBlade`) và 2 xương vây ngực (`PectoralL/R`), kết hợp biến dạng màng vây lưng/vây hậu môn và nhịp thở nắp mang bằng `onBeforeCompile`.
  - Khi người dùng dừng cuộn hoàn toàn, cá vẫn bơi tự nhiên liên tục mà không làm trôi vị trí độ sâu.
  - Có sẵn mô hình cá dự phòng đa khớp nối 11 bộ phận (`?fish=fallback`) nếu không tải được GLB.
- **Một nguồn tiến độ cuộn chuẩn tắc (`src/lib/scrollDirector.ts`, `src/lib/fishPath.ts`, `src/lib/chapterConfig.ts`):**
  - `scrollProgress ∈ [0, 1]` điều khiển đồng bộ đường bơi 3D `CatmullRomCurve3`, góc nghiêng thân cá khi cua (`bankRadians`), khung hình camera thích ứng tỷ lệ màn hình dọc/ngang, màu nước, mật độ sương mù `FogExp2`, hệ đèn 3 điểm, đàn cá phụ (`grey-snapper.glb`), rừng tảo bẹ, sứa phát quang, đồng bằng trầm tích, hẻm vực kiến tạo và khe nứt lạnh Hadal.
  - Cuộn ngược lên khôi phục chính xác độ sâu, ánh sáng và tầng biển trước đó.
- **Khả năng tiếp cận & Tương thích:**
  - Tôn trọng `prefers-reduced-motion` và có nút bật/tắt **Giảm chuyển động** + bộ chọn mức đồ họa (`Auto / High / Balanced / Low`) ngay trong thanh công cụ gọn dưới đáy màn hình.
  - Tự động phát hiện trình duyệt không có WebGL (hoặc kiểm thử qua `?webgl=fallback`) để hiển thị giao diện hành trình 8 tầng biển tương thích đầy đủ.
  - Ngăn kéo tùy chọn **Sổ tay Hải dương** kết nối endpoint `/api/pelagic-notes` khi chạy full-stack hoặc tự động chuyển sang ghi chép hải dương học tĩnh khi triển khai dạng static site trên Vercel.

---

## Cài đặt & Chạy trên máy cục bộ

Yêu cầu **Node.js >= 20** và `npm`:

```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy kiểm thử đơn vị (logic đường bơi, độ sâu, 8 tầng biển & chuyển động vẫy đuôi)
npm test

# 3. Kiểm tra kiểu TypeScript
npm run typecheck

# 4. Chạy môi trường phát triển (cổng 3000)
npm run dev

# 5. Build bản production tĩnh (xuất ra thư mục dist/)
npm run build

# 6. Xem thử bản build tĩnh
npm run preview
```

---

## Triển khai lên Vercel (Static Vite Preset)

Dự án tương thích trực tiếp với cấu hình Vite mặc định của Vercel mà không cần cấu hình phức tạp:

- **Framework Preset:** `Vite`
- **Install Command:** `npm install`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Toàn bộ mô hình 3D (`public/assets/fish/*.glb`) được phục vụ từ đường dẫn tương đối gốc `/assets/fish/...` và được đóng gói trực tiếp vào `dist/assets/fish/`.

---

## Tham số URL hỗ trợ kiểm thử (QA Hooks)

- `?webgl=fallback` — Mở chế độ giao diện tương thích không cần WebGL.
- `?fish=fallback` — Buộc kích hoạt mô hình cá 3D đa khớp nối dự phòng.
- `?motion=reduced` — Khởi động sẵn ở chế độ Giảm chuyển động.
- `?autostart=1` — Bỏ qua màn hình chờ tải ban đầu trong các bài kiểm thử tự động.

---

## Giấy phép tài nguyên

Xem chi tiết nguồn gốc và giấy phép (`CC0-1.0`, `CC-BY-4.0`, `MIT`, `OFL-1.1`) trong tệp [`ASSET_CREDITS.md`](./ASSET_CREDITS.md) và quá trình đánh giá mô hình trong [`ASSET_RESEARCH.md`](./ASSET_RESEARCH.md).
