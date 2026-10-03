import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata = { title: 'Kebijakan Refund - NFC Review' };

export default function RefundPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Kebijakan Pengembalian Dana</h1>
        <p className="text-muted-foreground mb-8">Terakhir diperbarui: 1 Juni 2026</p>
        <Card>
          <CardContent className="pt-6 space-y-6 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Kondisi Refund 100%</h2>
              <ul className="text-muted-foreground list-disc pl-5 space-y-1">
                <li>Barang hilang/rusak selama pengiriman (dengan bukti dari ekspedisi)</li>
                <li>Chip NFC tidak berfungsi dari pabrik (dibuktikan dengan video test)</li>
                <li>Salah kirim produk / spek tidak sesuai pesanan</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Kondisi TIDAK Berlaku Refund</h2>
              <ul className="text-muted-foreground list-disc pl-5 space-y-1">
                <li>Kartu sudah diaktifkan &amp; digunakan</li>
                <li>Kerusakan akibat kelalaian pengguna (jatuh, terbakar, dsb)</li>
                <li>Perubahan rencana sepihak dari pembeli</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Prosedur Pengajuan</h2>
              <ol className="text-muted-foreground list-decimal pl-5 space-y-1">
                <li>Chat admin WhatsApp dengan foto/video bukti</li>
                <li>Tim kami review dalam 1x24 jam</li>
                <li>Jika disetujui, dana dikembalikan via transfer bank/e-wallet 2-3 hari kerja</li>
              </ol>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Kontak</h2>
              <p className="text-muted-foreground">WhatsApp admin: <strong>+62 851 8314 4404</strong></p>
            </section>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
