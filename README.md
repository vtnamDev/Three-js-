# PELAGIC — THE DEEP DESCENT

Trải nghiệm đại dương 3D điện ảnh điều khiển bằng thao tác cuộn trang (`scroll` / `touch` / bàn phím), đưa người xem lặn theo một cá thể cá đại dương bơi liên tục qua **8 tầng độ sâu** từ mặt nước ngập nắng (`0 m`) xuống đáy vực thẳm **Hadal (`10.920 m`)**.

---

## Kiến trúc kỹ thuật chính

- **Stack:** Vite + React 19 + TypeScript + Three.js (`THREE.WebGLRenderer` đơn nhất, một vòng lặp render duy nhất).
- **Mô hình cá hề 3D & chuyển động (`src/lib/fishSwim.ts`):**
  - Hero sử dụng `public/assets/fish/clownfish-animated.glb` từ Quaternius Animated Cute Fish Pack (**CC0-1.0**, khoảng 169 KB), có skinning thật và sáu clip animation tích hợp.
  - Animation mixer phát `Swimming_Normal`, pha sang `Swimming_Fast` khi cuộn nhanh; cá tiếp tục bơi khi người dùng dừng cuộn mà không làm trôi vị trí độ sâu.
  - Vật liệu được hiệu chỉnh theo màu cam ấm, kem và nâu sẫm; model được fit/căn giữa bằng bounding box trước khi đưa vào quỹ đạo.
  - Mô hình procedural `buildProceduralFallbackFish()` chỉ dùng khi GLB không tải được hoặc URL QA `?fish=fallback` được chỉ định.
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

Các mô hình 3D hiện dùng (`public/assets/fish/*.glb`, gồm cá hề hoạt ảnh ~169 KB và cá phụ Grey Snapper) được phục vụ từ đường dẫn tương đối gốc `/assets/fish/...` và được đóng gói trực tiếp vào `dist/assets/fish/`.

---

## Tham số URL hỗ trợ kiểm thử (QA Hooks)

- `?webgl=fallback` — Mở chế độ giao diện tương thích không cần WebGL.
- `?fish=fallback` — Buộc kích hoạt mô hình cá 3D đa khớp nối dự phòng.
- `?motion=reduced` — Khởi động sẵn ở chế độ Giảm chuyển động.
- `?autostart=1` — Bỏ qua màn hình chờ tải ban đầu trong các bài kiểm thử tự động.

---

## Giấy phép tài nguyên

Xem chi tiết nguồn gốc và giấy phép (`CC0-1.0`, `CC-BY-4.0`, `MIT`, `OFL-1.1`) trong tệp [`ASSET_CREDITS.md`](./ASSET_CREDITS.md) và quá trình đánh giá mô hình trong [`ASSET_RESEARCH.md`](./ASSET_RESEARCH.md).
