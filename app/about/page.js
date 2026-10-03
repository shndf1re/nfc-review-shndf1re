import Link from 'next/link';

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px', fontFamily: '-apple-system, sans-serif', color: '#0f172a', lineHeight: '1.6' }}>
      <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>⬅ Kembali ke Beranda</Link>
      <h1 style={{ marginTop: '24px', fontSize: '32px', fontWeight: '800' }}>Tentang Kami</h1>
      <p>Selamat datang di <strong>NFC Google Review</strong>.</p>
      <p>Kami adalah penyedia solusi cerdas berbasis teknologi NFC dan QR Code yang berlokasi di Samarinda, Kalimantan Timur. Kami berdedikasi membantu para pemilik usaha lokal—mulai dari kafe, restoran, klinik, barbershop, hingga layanan jasa—untuk memaksimalkan potensi bisnis mereka di era digital.</p>
      <p>Produk utama kami adalah <strong>Papan Akrilik Google Review Pintar</strong> yang dirancang elegan menggunakan metode <em>Print UV</em> berkualitas tinggi. Dengan alat ini, kami menyelesaikan masalah klasik yang sering dialami pemilik usaha: susahnya meminta ulasan pelanggan karena proses pencarian di Google Maps yang panjang dan membosankan.</p>
      <p>Misi kami sederhana: Membantu usaha Anda mendominasi pencarian lokal dengan cara mempercepat dan mempermudah pelanggan memberikan rating Bintang 5, cukup dengan satu kali sentuhan (Tap).</p>
      <p>Terima kasih telah mempercayakan reputasi digital bisnis Anda kepada kami!</p>
    </div>
  );
}
