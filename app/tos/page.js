import Link from 'next/link';

export default function TosPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px', fontFamily: '-apple-system, sans-serif', color: '#0f172a', lineHeight: '1.6' }}>
      <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>⬅ Kembali ke Beranda</Link>
      <h1 style={{ marginTop: '24px', fontSize: '32px', fontWeight: '800' }}>Syarat & Ketentuan</h1>
      
      <h3>1. Ketentuan Umum</h3>
      <p>Dengan mengakses dan melakukan pembelian di situs web kami, Anda setuju untuk terikat oleh Syarat dan Ketentuan ini. Produk yang kami jual adalah perangkat keras (Papan Akrilik) yang ditanamkan Chip NFC dan dicetak QR Code.</p>
      
      <h3>2. Pemesanan dan Pembayaran</h3>
      <p>Pesanan Anda akan diproses setelah pembayaran berhasil dikonfirmasi oleh sistem Payment Gateway kami. Harga yang tertera dapat berubah sewaktu-waktu sesuai dengan masa promosi yang berlaku.</p>
      
      <h3>3. Penggunaan Produk</h3>
      <p>Papan NFC ini dirancang untuk memudahkan pengunjung memberikan ulasan Google Maps. Kami tidak bertanggung jawab atas isi ulasan yang diberikan oleh pelanggan Anda. Kami hanya menyediakan perantara teknologi (hardware dan link redirect) menuju halaman profil bisnis Anda.</p>

      <h3>4. Hak Kekayaan Intelektual</h3>
      <p>Sistem perangkat lunak (*software*) dan manajemen tautan yang kami sediakan untuk mengelola Chip NFC adalah hak milik penuh layanan kami. Pelanggan dilarang untuk menyalin atau menduplikasi sistem <em>redirect</em> kami tanpa izin tertulis.</p>
    </div>
  );
}
