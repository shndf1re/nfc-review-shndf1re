import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata = { title: 'Kebijakan Privasi - NFC Review' };

export default function PrivacyPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Kebijakan Privasi</h1>
        <p className="text-muted-foreground mb-8">Terakhir diperbarui: 1 Juni 2026</p>
        <Card>
          <CardContent className="pt-6 space-y-6 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Data yang Kami Kumpulkan</h2>
              <p className="text-muted-foreground">Nama, nomor WhatsApp, alamat pengiriman, dan email (jika diisi) saat Anda melakukan pembelian. Statistik anonim tap NFC &amp; scan QR Code untuk keperluan analitik produk.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Cara Kami Menggunakan Data</h2>
              <p className="text-muted-foreground">Data pembeli hanya digunakan untuk pemrosesan pesanan dan pengiriman. Statistik tap/scan digunakan untuk perbaikan produk. Kami TIDAK menjual atau membagi data Anda ke pihak ketiga.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Keamanan Data</h2>
              <p className="text-muted-foreground">Data disimpan di infrastruktur Supabase (bersertifikat SOC 2) dengan Row Level Security &amp; enkripsi password bcrypt. Akses admin diproteksi JWT httpOnly cookie.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Hak Anda</h2>
              <p className="text-muted-foreground">Anda berhak meminta ekspor atau penghapusan data pribadi Anda kapan saja. Kirim permintaan ke WhatsApp +62 851 8314 4404.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">5. Cookies</h2>
              <p className="text-muted-foreground">Kami menggunakan cookies session httpOnly untuk autentikasi admin. Tidak ada tracking cookie pihak ketiga.</p>
            </section>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
