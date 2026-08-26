// File Konfigurasi Terpusat Web App NFC & QR
export const SITE_CONFIG = {
  // 1. BRANDING UTAMA & KONTAK
  brandName: "NFC Google Review by shndf1re",
  domainUrl: "https://nfc-review-shndf1re.vercel.app", 
  supportWhatsapp: "6285156534909", // Nomor WhatsApp Jualan & Support Anda

  // 2. PIN RAHASIA HAPUS PENJUALAN (Bisa Anda ubah sesuai keinginan)
  adminSalesPin: "192168",

  // 3. PESAN OTOMATIS WHATSAPP PROMOSI (Halaman Landing Page)
  waPromoText: "Halo admin NFC Google Review by shndf1re, saya tertarik pesan Papan Akrilik Google Review NFC. Boleh minta info harga dan konsultasi?",

  // 4. GAMBAR & LOGO
  // Logo di tengah QR Code (Default: Logo Google Official)
  qrLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",

  // 5. TEKS HALAMAN ADMIN PORTAL (/admin)
  adminTitle: "Dashboard Management NFC",
  adminSubtitle: "Portal Pengelolaan Unique Code & Chip NFC",

  // 6. TEKS HALAMAN SETUP / AKTIVASI PEMBELI (/setup/[id])
  setupTitle: "Aktivasi Papan Akrilik NFC & QR",
  setupSubtitle: "Hubungkan kartu Anda langsung ke halaman Google Review toko dalam 1 menit.",
  setupInstruction: "Masukkan PIN 6-digit yang tertera pada paket pembelian dan tempelkan link Google Review toko Anda di bawah ini.",
  setupSuccessTitle: "🎉 Papan Akrilik Berhasil Diaktifkan!",
  setupSuccessMessage: "Kartu NFC dan QR Code Anda sudah terhubung secara permanen ke ulasan Google Review toko Anda.",

  // 7. TEKS HALAMAN STATISTIK (/admin/stats)
  statsTitle: "📊 Statistik Pemakaian",
  statsSubtitle: "Analisis Tap NFC vs Scan QR Code Per Kartu"
};
