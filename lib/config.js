// File Konfigurasi Terpusat Web App NFC & QR
export const SITE_CONFIG = {
  // 1. BRANDING UTAMA
  brandName: "Google Review NFC by shndf1re",
  domainUrl: "https://nfc-review-shndf1re.vercel.app", // Domain Vercel / Custom Domain Anda
  supportWhatsapp: "6285156534909", // Nomor WA untuk bantuan pelanggan (format 62...)

  // 2. GAMBAR & LOGO (Gunakan Direct Link Gambar)
  // Logo Default di Tengah QR Code (Ukuran persegi/square transparan lebih bagus)
  qrLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
  
  // Logo Header Web App / Favicon (jika ada)
  appLogoUrl: "https://api.iconify.design/lucide:nfc.svg?color=%232563eb",

  // 3. TEKS UNTUK HALAMAN SETUP / AKTIVASI PEMBELI (/setup/[id])
  setupTitle: "Aktivasi Papan Akrilik NFC & QR",
  setupSubtitle: "Hubungkan kartu Anda langsung ke halaman Google Review toko dalam 1 menit.",
  setupInstruction: "Masukkan PIN 6-digit yang tertera pada paket pembelian dan tempelkan link Google Review toko Anda di bawah ini.",
  setupSuccessTitle: "🎉 Papan Akrilik Berhasil Diaktifkan!",
  setupSuccessMessage: "Kartu NFC dan QR Code Anda sudah terhubung secara permanen ke ulasan Google Review toko Anda.",

  // 4. TEKS UNTUK ADMIN PORTAL (/admin)
  adminTitle: "Dashboard Management NFC",
  adminSubtitle: "Portal Pengelolaan Unique Code & Chip NFC",
  
  // 5. TEKS UNTUK HALAMAN STATISTIK (/admin/stats)
  statsTitle: "📊 Statistik Pemakaian",
  statsSubtitle: "Analisis Tap NFC vs Scan QR Code Per Kartu"
};
