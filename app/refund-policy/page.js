import Link from 'next/link';

export default function RefundPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px', fontFamily: '-apple-system, sans-serif', color: '#0f172a', lineHeight: '1.6' }}>
      <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>⬅ Kembali ke Beranda</Link>
      <h1 style={{ marginTop: '24px', fontSize: '32px', fontWeight: '800' }}>Kebijakan Pengembalian Dana (Refund Policy)</h1>
      
      <p>Kami berkomitmen memberikan produk dengan kualitas terbaik. Jika terjadi kendala pada pesanan Anda, berikut adalah kebijakan pengembalian dan garansi kami:</p>
      
      <h3>1. Garansi Produk (Chip NFC & Papan)</h3>
      <p>Kami memberikan garansi penukaran produk (Retur) apabila:
        <ul>
          <li>Papan akrilik patah/pecah saat diterima (Wajib menyertakan Video Unboxing tanpa jeda).</li>
          <li>Chip NFC rusak atau tidak dapat dibaca sama sekali oleh perangkat yang mendukung NFC.</li>
          <li>Kesalahan cetak fatal dari pihak kami.</li>
        </ul>
      </p>
      
      <h3>2. Ketentuan Pengembalian Dana (Refund)</h3>
      <p>Pengembalian dana hanya dapat dilakukan jika stok produk kami kosong setelah Anda melakukan pembayaran, atau kami tidak dapat memenuhi pesanan sesuai kesepakatan waktu awal.</p>
      <p>Kami <strong>tidak menerima</strong> pengembalian dana (Refund) jika produk sudah diproses atau dikirim, atau karena alasan pembatalan sepihak setelah pembayaran berhasil. Namun, kami akan bertanggung jawab penuh memberikan <strong>Produk Pengganti (Retur)</strong> jika barang cacat sesuai poin 1.</p>
      
      <h3>3. Proses Klaim</h3>
      <p>Hubungi Customer Service WhatsApp kami maksimal 2x24 jam sejak resi ekspedisi dinyatakan "Terkirim". Sertakan nomor pesanan (Invoice) dan bukti video unboxing.</p>
    </div>
  );
}
