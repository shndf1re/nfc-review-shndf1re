import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata = { title: 'Syarat & Ketentuan - NFC Review' };

export default function TosPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/app-icon.png" alt="logo" className="h-9 w-9 rounded-xl" />
            <span className="font-bold text-base">NFC Review<span className="text-primary">.</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm"><Link href="/"><ArrowLeft className="h-4 w-4 mr-1.5" /> Beranda</Link></Button>
          </div>
        </div>
      </nav>

      <section className="container py-16 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Syarat &amp; Ketentuan</h1>
        <p className="text-muted-foreground mb-8">Terakhir diperbarui: 1 Juni 2026</p>

        <Card>
          <CardContent className="pt-6 space-y-6 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Pembelian Produk</h2>
              <p className="text-muted-foreground">Dengan melakukan pembelian, Anda setuju untuk membayar harga yang tertera. Harga sudah termasuk 1 papan akrilik NFC + QR Code backup. Ongkir dihitung terpisah berdasarkan lokasi pengiriman.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Pengiriman</h2>
              <p className="text-muted-foreground">Pesanan diproses 1x24 jam setelah pembayaran dikonfirmasi. Pengiriman menggunakan ekspedisi pilihan kami (JNE/JNT/Lion Parcel/Kurir Lokal Samarinda). Estimasi tiba: 1-5 hari kerja.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Aktivasi &amp; Penggunaan</h2>
              <p className="text-muted-foreground">Kartu baru menggunakan PIN default 000000. Saat aktivasi, Anda wajib membuat PIN baru 6-digit milik Anda sendiri — PIN ini wajib dirahasiakan dan dipakai untuk mengubah atau me-reset papan. Satu PIN hanya untuk satu kartu. Setelah aktivasi, link target bisa diubah kapan saja lewat halaman aktivasi tanpa biaya tambahan.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Garansi</h2>
              <p className="text-muted-foreground">Chip NFC bergaransi seumur hidup terhadap kerusakan pabrik. Akrilik bergaransi 1 tahun. Garansi tidak mencakup kerusakan karena kelalaian pengguna (jatuh, terbakar, terkena cairan korosif).</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">5. Hak &amp; Kewajiban</h2>
              <p className="text-muted-foreground">Pembeli bertanggung jawab atas konten/link target yang dihubungkan ke kartu. Kami berhak menonaktifkan kartu yang digunakan untuk aktivitas ilegal, phishing, atau melanggar hukum Indonesia.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">6. Kontak</h2>
              <p className="text-muted-foreground">Pertanyaan terkait syarat ini bisa diajukan ke WhatsApp +62 851 8314 4404.</p>
            </section>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
