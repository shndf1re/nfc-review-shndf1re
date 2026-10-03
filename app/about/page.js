import Link from 'next/link';
import { MapPin, Zap, Star, ShieldCheck, Store, Nfc, QrCode, Printer, ArrowRight, MessageCircle, Target, HeartHandshake } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/site/site-shell';
import { SITE_CONFIG } from '@/lib/config';
import CustomerGallery from '@/components/site/customer-gallery';

// Ganti / tambah foto: taruh file di /public lalu tambahkan ke daftar ini
const gallery = [
  { src: '/galeri-1.jpg', title: 'Papan siap dikirim ke pelanggan', category: 'Produksi Print UV' },
  { src: '/galeri-2.jpg', title: 'Tap NFC langsung ke Google Review', category: 'Kafe & Resto' },
  { src: '/galeri-3.jpg', title: 'Terpasang di meja kasir toko', category: 'Toko Lokal' },
  { src: '/galeri-4.jpg', title: 'Scan QR untuk HP tanpa NFC', category: 'UMKM Samarinda' },
];

export const metadata = {
  title: 'Tentang Kami - NFC Review',
  description: 'NFC Review: papan akrilik Google Review NFC & QR untuk UMKM, dari Samarinda, Kalimantan Timur.',
};

const stats = [
  { value: '1 Tap', label: 'Langsung ke form review' },
  { value: '3–5x', label: 'Rata-rata kenaikan review' },
  { value: '100+', label: 'Toko lokal terbantu' },
  { value: 'Seumur Hidup', label: 'Garansi chip NFC' },
];

const values = [
  { icon: Zap, title: 'Cepat & Tanpa Ribet', desc: 'Pelanggan cukup tap HP atau scan QR. Tanpa aplikasi, tanpa mencari nama toko di Google Maps.' },
  { icon: Printer, title: 'Kualitas Print UV', desc: 'Papan akrilik dicetak UV berkualitas tinggi — elegan, tahan air, dan awet di meja kasir.' },
  { icon: ShieldCheck, title: 'Aman & Fleksibel', desc: 'Link review bisa diubah kapan saja dengan PIN milik Anda sendiri. Data dilindungi di server.' },
];

const audiences = ['Kafe & Restoran', 'Klinik & Apotek', 'Barbershop & Salon', 'Toko Oleh-oleh', 'Bengkel & Jasa', 'Hotel & Penginapan'];

export default function AboutPage() {
  const waUrl = `https://wa.me/${SITE_CONFIG.supportWhatsapp}?text=${encodeURIComponent(SITE_CONFIG.waPromoText)}`;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary/10 via-violet-500/5 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <MapPin className="h-3.5 w-3.5" /> Samarinda, Kalimantan Timur
          </div>
          <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Membantu UMKM <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">mendominasi pencarian lokal</span> lewat satu tap.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Kami adalah penyedia solusi berbasis teknologi <b className="text-foreground">NFC dan QR Code</b> yang membantu pemilik usaha lokal memaksimalkan reputasi digital mereka di Google.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/beli" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-500 px-6 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95">
              Pesan Papan Sekarang <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-semibold shadow-sm hover:bg-accent">
              <MessageCircle className="h-4 w-4 text-emerald-500" /> Konsultasi via WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="text-xl font-bold tracking-tight text-primary sm:text-2xl">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* STORY */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div className="relative">
          <div className="overflow-hidden rounded-3xl border border-border shadow-xl">
            <img src="/galeri-2.jpg" alt="Papan akrilik Google Review NFC" className="aspect-[4/3] w-full object-cover" />
          </div>
          <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</div>
            <span className="text-xs font-semibold">Rating bintang 5 lebih mudah</span>
          </div>
        </div>
        <div className="space-y-5 pt-4 lg:pt-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Cerita Kami</div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Masalah klasik: pelanggan puas, tapi malas kasih review.</h2>
          <p className="leading-relaxed text-muted-foreground">
            Proses mencari toko di Google Maps itu panjang dan membosankan. Akibatnya, banyak pelanggan yang puas tidak pernah meninggalkan ulasan. Produk utama kami, <b className="text-foreground">Papan Akrilik Google Review Pintar</b>, memangkas semua langkah itu menjadi satu sentuhan.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Nfc className="h-4 w-4" /></span><span className="text-sm font-medium">Tap NFC</span></div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600"><QrCode className="h-4 w-4" /></span><span className="text-sm font-medium">Scan QR</span></div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Target className="h-4 w-4" /> Misi Kami</div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Mempercepat & mempermudah pelanggan memberi rating bintang 5.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-md shadow-primary/25"><v.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-semibold">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALERI PELANGGAN */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6" id="galeri">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Galeri Pelanggan</div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Sudah terpasang di toko-toko lokal</h2>
          </div>
          <p className="text-sm text-muted-foreground">Ketuk foto untuk memperbesar</p>
        </div>
        <CustomerGallery items={gallery} />
      </section>

      {/* AUDIENCE */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Store className="h-4 w-4" /> Cocok Untuk</div>
        <div className="mt-5 flex flex-wrap gap-2">
          {audiences.map((a) => (
            <span key={a} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm">{a}</span>
          ))}
        </div>

        <div className="relative mt-14 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white sm:p-12">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <HeartHandshake className="h-8 w-8 opacity-90" />
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Terima kasih telah mempercayakan reputasi digital bisnis Anda kepada kami.</h2>
            </div>
            <Link href="/beli" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-indigo-700 shadow-lg hover:bg-white/90">
              Mulai Sekarang <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
