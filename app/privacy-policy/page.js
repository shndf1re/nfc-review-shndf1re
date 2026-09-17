import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px', fontFamily: '-apple-system, sans-serif', color: '#0f172a', lineHeight: '1.6' }}>
      <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>⬅ Kembali ke Beranda</Link>
      <h1 style={{ marginTop: '24px', fontSize: '32px', fontWeight: '800' }}>Kebijakan Privasi</h1>
      <p>Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
      <p>Privasi Anda sangat penting bagi kami. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda saat menggunakan situs web dan layanan Papan NFC Google Review kami.</p>
      
      <h3>1. Informasi yang Kami Kumpulkan</h3>
      <p>Kami hanya mengumpulkan informasi yang diperlukan untuk memproses pesanan dan pengiriman produk Anda, yang meliputi: Nama, Alamat Lengkap, Nomor Telepon/WhatsApp, dan Link Google Maps bisnis Anda (opsional, untuk keperluan setting papan).</p>
      
      <h3>2. Penggunaan Informasi</h3>
      <p>Informasi yang kami kumpulkan digunakan semata-mata untuk: Memproses pesanan, mengatur pengiriman melalui pihak ekspedisi, dan memberikan dukungan pelanggan (customer service).</p>
      
      <h3>3. Keamanan Data</h3>
      <p>Kami tidak akan pernah menjual, menyewakan, atau membagikan data pribadi pelanggan kepada pihak ketiga mana pun di luar kepentingan pengiriman barang dan proses pembayaran (Payment Gateway).</p>
    </div>
  );
}
