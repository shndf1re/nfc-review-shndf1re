# NFC Review — Admin SaaS Redesign (lanjutan dari GitHub)

## Konteks
- Repo asal: github.com/shndf1re/nfc-review-shndf1re (Next.js 14 + Tailwind + Supabase). Jalur fallback: perubahan admin yang belum di-push dianggap hilang.
- Stack TIDAK dimigrasi. Env di /app/.env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET.
- yarn install butuh `--ignore-engines` (supabase-js minta Node 22, container Node 20).

## Sudah selesai (Okt 2026)
- Fase 1: import repo, yarn install, env Supabase, dev server jalan, login asli OK (shndf1re = super_admin).
- Fase 2: design system `components/admin/kit.jsx` (PageHeader, Panel, KpiCard, Pill, Btn, Modal bottom-sheet, PinField, useToast, Table Th/Td, EmptyState, Skeleton). Tema `.admin-theme` (indigo/violet, Inter) di globals.css — hanya berlaku di /admin.
- `app/admin/layout.js` sidebar baru; `app/admin/page.js` (login split-screen + dashboard KPI, tabel/list, modal PIN/Edit/Preview QR, pagination).
- Fase 3: `app/admin/stats/page.js` & `app/admin/users/page.js` pakai pola yang sama.
- Bugfix: stats reset PIN sebelumnya selalu lolos (RPC verify_sales_pin mengembalikan array) — sekarang cek `[0].is_valid`.
- Fase 4: `yarn build` sukses tanpa error; screenshot QA desktop + HP.

- `/admin/sales` juga di-redesign (KPI, filter periode, form manual, kode promo, riwayat tabel/list, modal resi/PIN/stok menipis). Bugfix PIN sales (array truthy) + modal WA stok menipis kini benar-benar tampil.
- `.env` ditambahkan ke .gitignore (repo public!).

## Belum
- User: Save to GitHub lalu deploy ulang. Pastikan env Supabase + JWT_SECRET ada di hosting.

## Update: Setup & PIN default (Okt 2026)
- /setup/[id] redesign: stepper 3 langkah (Data Toko -> PIN default 000000 -> buat PIN baru), view aktif (ubah data / reset), modal sukses menampilkan PIN baru.
- API server-side: GET /api/setup/[id] (tanpa PIN), POST /activate, POST /reset (lib/setup-server.js). Host review URL di-allowlist.
- Aturan: kartu belum aktif = PIN 000000 (juga terima PIN lama sbg fallback); aktif = PIN pelanggan; reset -> 000000. Generate/bulk/admin reset -> 000000. WA pelanggan pakai PIN default.
- Migrasi data: 54 kartu inactive di-set pin 000000 (backup di memory/backup_inactive_pins_before_000000.json, gitignored).
- Catatan keamanan: RLS tabel devices masih mengizinkan anon baca/ubah (admin page pakai anon key) -> saran perketat RLS + pindahkan query admin ke API.

## Update: Audit UI publik (Okt 2026)
- Tema global (:root/.dark) disamakan dengan admin (indigo/violet); font Inter aktif global (tailwind fontFamily.sans).
- /about redesign (hero, stats, cerita, misi, CTA) + components/site/site-shell.jsx (SiteNav/SiteFooter).
- /c/[sessionId] checkout redesign (timer promo, stepper, qty stepper, kurir radio-card, kupon, ringkasan sticky, modal pesanan) — logika Tripay/ongkir/emsifa tetap; alert() -> error inline.
- app/not-found.js (404 bermerek). Teks TOS + landing "Cara Kerja" diperbarui ke alur PIN default 000000.

## Update: Lacak Resi + Galeri (Okt 2026)
- /api/resi (lib/resi.js, BinderByte) -> timeline posisi paket; delivered => order otomatis "Selesai". Komponen components/resi-tracker.jsx dipakai di /track (inline) & /admin/sales (tombol "Lacak" + modal).
- Bugfix /track: kolom salah (tracking_number->resi_number, total_amount->total_price, customer_address->shipping_address) + label status Indonesia.
- /about: Galeri Pelanggan (components/site/customer-gallery.jsx, lightbox + swipe). Tambah foto: taruh di /public & tambah ke array `gallery` di app/about/page.js.
- BINDERBYTE_API_KEY tidak ada di workspace -> pastikan ada di env hosting.
