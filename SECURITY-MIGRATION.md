# 🔒 Security Migration Guide - NFC Review

Panduan deploy perubahan keamanan Phase 1 ini ke produksi Anda (Vercel + Supabase).

## Ringkasan Perubahan

### ✅ Yang Sudah Diperbaiki
1. **Server-side auth via JWT + httpOnly cookie** → tidak bisa dibypass dari DevTools
2. **Middleware proteksi `/admin/*`** → unauthenticated request otomatis redirect ke login
3. **Role check `/admin/users` → super_admin only** di level middleware
4. **Password & PIN wajib bcrypt** (fallback plaintext hanya saat migrasi)
5. **Open-redirect check di `/r/:id`** → hanya host Google yang di-whitelist
6. **Service role Supabase untuk operasi admin** → bypass RLS dengan aman
7. **Row Level Security (RLS) di semua tabel sensitif** (file `supabase-rls.sql`)

---

## 📋 Checklist Deploy

### Step 1 — Set Environment Variables di Vercel
Di dashboard Vercel → Settings → Environment Variables, **tambahkan**:

| Nama | Value | Keterangan |
|------|-------|-----------|
| `JWT_SECRET` | String acak minimal 32 karakter (contoh: hasil `openssl rand -base64 48`) | **WAJIB** – kunci untuk sign JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Ambil dari Supabase Dashboard → Settings → API → `service_role` secret | **WAJIB** – bypass RLS di server |

Yang sudah ada tetap dipakai: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `TRIPAY_API_KEY`, `TRIPAY_PRIVATE_KEY`, `TRIPAY_MERCHANT_CODE`, `BINDERBYTE_API_KEY`, `BITESHIP_API_KEY`.

> ⚠️ **JANGAN PERNAH** expose `SUPABASE_SERVICE_ROLE_KEY` ke client. Jangan ada `NEXT_PUBLIC_` prefix.

### Step 2 — Jalankan SQL RLS di Supabase
1. Buka Supabase Dashboard → SQL Editor → New Query
2. Copy-paste seluruh isi `supabase-rls.sql`
3. Klik **Run**
4. Verifikasi di Table Editor → setiap tabel punya ikon 🔒 (RLS Enabled)

### Step 3 — Deploy ke Vercel
```bash
git add -A
git commit -m "feat(security): JWT auth + RLS + bcrypt migration (Phase 1)"
git push
```
Vercel otomatis build & deploy.

### Step 4 — Migrasi Password Lama (sekali saja)
Setelah deploy sukses:
1. Login ke `/admin` dengan super admin (password/PIN plaintext lama masih berfungsi karena ada fallback)
2. Jalankan di terminal / Postman / cURL:
   ```bash
   curl -X POST https://DOMAIN-ANDA.vercel.app/api/admin/migrate-passwords \
     -H "Cookie: nfc_admin_token=TOKEN_DARI_DEVTOOLS" 
   ```
   **ATAU** lebih mudah: buka DevTools di `/admin` yang sudah login → Console → paste:
   ```js
   fetch('/api/admin/migrate-passwords', { method: 'POST' }).then(r => r.json()).then(console.log)
   ```
3. Response akan menampilkan `{ migrated: N, skipped: M }`
4. **Logout dan login ulang** untuk verifikasi bcrypt bekerja

### Step 5 — Verifikasi Keamanan
- [ ] Buka `/admin/stats` di browser tanpa login → otomatis redirect ke `/admin`
- [ ] Buka DevTools → coba `localStorage.setItem('nfc_admin_session','true')` lalu akses `/admin/users` → tetap diblokir middleware
- [ ] Login dengan password salah → ditolak
- [ ] Login super admin → masuk; login staff → menu "Kelola Tim" tidak muncul & akses `/admin/users` di-redirect
- [ ] Logout → cookie `nfc_admin_token` hilang di Application → Cookies

---

## 🚨 Breaking Changes

1. **Semua operasi DB admin yang sebelumnya langsung dari browser** (via `supabase` client di komponen) akan tetap bekerja karena anon key masih punya SELECT devices/inventory. Untuk INSERT/UPDATE/DELETE sensitif, nanti akan dipindah ke API routes di Phase 2.
2. **Browser DevTools tidak bisa lagi bypass login.** Pastikan Anda tahu password super admin sebelum deploy. Kalau lupa → reset manual via Supabase SQL Editor.
3. Setelah migrasi password, password lama di DB sudah berubah jadi bcrypt hash. Tidak ada rollback.

---

## 🔮 Phase Berikutnya (sudah di-plan)
- **Phase 2 (Functional)**: Hapus Midtrans webhook, fix typo CSS, satukan AutoLogout, pindahkan semua DB write admin ke API routes agar RLS bisa dibikin lebih ketat lagi.
- **Phase 3 (UI/UX)**: Migrasi full ke Tailwind + shadcn/ui + lucide-react, design system konsisten, responsive, dark mode.
