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

## Belum
- `/admin/sales` masih gaya lama (di luar 3 halaman scope).
- Commit & push ke GitHub (pakai fitur "Save to GitHub") + deploy ulang (Vercel/hosting asli).
