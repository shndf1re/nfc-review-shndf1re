'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { SITE_CONFIG } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Smartphone,
  QrCode,
  Zap,
  ShieldCheck,
  Star,
  ArrowRight,
  Sparkles,
  MessageCircle,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  Clock,
  Store,
  TrendingUp,
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const formatRupiah = (n) =>
  'Rp ' + Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 });

export default function LandingPage() {
  const router = useRouter();
  const waUrl = `https://wa.me/${SITE_CONFIG.supportWhatsapp}?text=${encodeURIComponent(
    SITE_CONFIG.waPromoText
  )}`;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [cardIdInput, setCardIdInput] = useState('');
  const [cardPinInput, setCardPinInput] = useState('');
  const [activateError, setActivateError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const ORIGINAL_PRICE = SITE_CONFIG.pricing?.originalPrice || 100000;
  const DISCOUNT_PRICE = SITE_CONFIG.pricing?.discountPrice || 50000;
  const DISCOUNT_PERCENT = Math.round(
    ((ORIGINAL_PRICE - DISCOUNT_PRICE) / ORIGINAL_PRICE) * 100
  );

  const handleVerifyAndRedirect = async (e) => {
    e.preventDefault();
    setActivateError('');
    setVerifying(true);
    const cleanId = cardIdInput.trim();
    const cleanPin = cardPinInput.trim();
    if (!cleanId || !cleanPin) {
      setActivateError('ID Kartu dan PIN wajib diisi.');
      setVerifying(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('id, pin')
        .eq('id', cleanId)
        .maybeSingle();
      if (error || !data) setActivateError('ID Kartu tidak ditemukan.');
      else if (String(data.pin).trim() !== cleanPin)
        setActivateError('PIN salah. Cek pesan WA Anda.');
      else {
        setShowActivateModal(false);
        router.push(`/setup/${cleanId}`);
      }
    } catch (err) {
      setActivateError('Terjadi kesalahan jaringan.');
    } finally {
      setVerifying(false);
    }
  };

  const navLinks = [
    { href: '#features', label: 'Fitur' },
    { href: '#how', label: 'Cara Kerja' },
    { href: '#pricing', label: 'Harga' },
    { href: '/about', label: 'Tentang' },
    { href: '/track', label: 'Lacak Order' },
  ];

  const features = [
    {
      icon: Zap,
      title: 'Tap & Scan Instan',
      desc: 'Pelanggan tinggal tap NFC atau scan QR → langsung ke halaman review toko Anda. 1 detik.',
    },
    {
      icon: Store,
      title: 'Khusus Toko Lokal',
      desc: 'Didesain untuk UMKM Indonesia. Tahan air, tahan banting, estetik di meja kasir.',
    },
    {
      icon: TrendingUp,
      title: 'Review Naik Drastis',
      desc: 'Rata-rata toko kami naik 3-5x jumlah review Google dalam 30 hari pertama.',
    },
    {
      icon: ShieldCheck,
      title: 'Garansi Chip Seumur Hidup',
      desc: 'Chip NFC premium NTAG213. Rusak? Ganti gratis selamanya.',
    },
  ];

  const steps = [
    { num: 1, title: 'Pesan via WhatsApp', desc: 'Chat admin, bayar, paket dikirim 1-3 hari.' },
    { num: 2, title: 'Aktivasi 1 Menit', desc: 'Scan QR aktivasi, masukkan PIN, tempelkan link Google Review.' },
    { num: 3, title: 'Pajang di Toko', desc: 'Letakkan di meja kasir. Pelanggan tap → review masuk.' },
  ];

  const testimonials = [
    { name: 'Cafe Mocca Samarinda', text: 'Dari 12 review setahun, naik jadi 68 review dalam 2 bulan. Worth it banget!', rating: 5 },
    { name: 'Barbershop Kaltim', text: 'Enak banget, customer tinggal tap HP. Rating naik dari 4.3 ke 4.8.', rating: 5 },
    { name: 'Toko Oleh-Oleh Palu', text: 'Papannya kokoh, QR + NFC dua-duanya. Pembeli yang gaptek pun bisa.', rating: 5 },
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Gradient blobs background */}
      <div className="gradient-blob bg-primary/30 w-[400px] h-[400px] top-[-100px] right-[-150px]" />
      <div className="gradient-blob bg-chart-4/20 w-[500px] h-[500px] top-[400px] left-[-200px]" />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/app-icon.png" alt="logo" className="h-9 w-9 rounded-xl" />
            <span className="font-bold tracking-tight text-base sm:text-lg">
              NFC Review<span className="text-primary">.</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <a href="#pricing">
                Beli Sekarang <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)} aria-label="menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-card border-l border-border p-6 shadow-2xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between mb-8">
              <span className="font-bold">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setSidebarOpen(false)} className="px-3 py-3 rounded-lg hover:bg-accent text-sm font-medium">
                  {l.label}
                </Link>
              ))}
              <Button asChild className="mt-4">
                <a href="#pricing" onClick={() => setSidebarOpen(false)}>Beli Sekarang</a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="relative container pt-16 pb-20 md:pt-28 md:pb-32">
        <div className="max-w-3xl mx-auto text-center animate-fade-in-up">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs font-semibold">
            <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
            {DISCOUNT_PERCENT}% OFF Hari Ini — Terbatas
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Review Google Toko Anda,{' '}
            <span className="bg-gradient-to-r from-primary via-chart-4 to-chart-1 bg-clip-text text-transparent">
              Naik 5x Lebih Cepat
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Papan akrilik NFC + QR Code yang membuat pelanggan Anda tinggal{' '}
            <span className="font-semibold text-foreground">tap HP sekali</span> untuk langsung memberi review bintang 5. Tanpa aplikasi, tanpa ribet.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25">
              <a href="#pricing">
                Pesan Sekarang {formatRupiah(DISCOUNT_PRICE)}
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-6 text-base">
              <button onClick={() => setShowActivateModal(true)}>
                <QrCode className="mr-2 h-5 w-5" />
                Aktivasi Kartu
              </button>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-chart-2" /> Garansi Chip Seumur Hidup</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-chart-2" /> Pengiriman 1-3 Hari</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-chart-2" /> 100+ Toko Terpercaya</div>
          </div>
        </div>

        {/* Product preview card */}
        <div className="mt-16 md:mt-24 max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-chart-4/10 to-chart-1/10 border border-border/50 p-6 sm:p-10 backdrop-blur-sm">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <Badge className="mb-3">Produk Unggulan</Badge>
                <h3 className="text-2xl sm:text-3xl font-bold mb-3">Papan Akrilik Google Review NFC</h3>
                <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                  Dibuat dari akrilik premium 3mm dengan chip NFC NTAG213 + QR Code backup. Siap pakai, tahan lama, dan terlihat profesional di meja kasir.
                </p>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl sm:text-4xl font-bold text-primary">{formatRupiah(DISCOUNT_PRICE)}</span>
                  <span className="text-lg text-muted-foreground line-through">{formatRupiah(ORIGINAL_PRICE)}</span>
                  <Badge variant="destructive">-{DISCOUNT_PERCENT}%</Badge>
                </div>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/beli">Checkout Sekarang <ChevronRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
              <div className="flex justify-center">
                <div className="relative aspect-square w-full max-w-xs rounded-2xl bg-card border border-border overflow-hidden shadow-2xl">
                  <img src="/galeri-1.jpg" alt="produk" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="container py-16 md:py-24 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-3">Kenapa pilih kami</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Dibuat untuk toko yang serius<br />tingkatkan reputasi digital
          </h2>
          <p className="text-muted-foreground">4 alasan kuat kenapa 100+ toko sudah pindah ke sistem ini.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <Card key={f.title} className="relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardContent className="pt-6">
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="container py-16 md:py-24 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-3">Cara kerja</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">3 langkah dari order ke review masuk</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <div key={s.num} className="relative">
              <div className="rounded-2xl bg-card border border-border p-6 hover:border-primary/50 transition-colors h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">
                    {s.num}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground hidden md:block" />
                </div>
                <h3 className="font-semibold mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container py-16 md:py-24 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-3">Testimoni</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">Dipercaya 100+ toko di seluruh Indonesia</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <Card key={t.name} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-chart-3 text-chart-3" />
                  ))}
                </div>
                <p className="text-sm text-foreground mb-4 leading-relaxed">"{t.text}"</p>
                <div className="text-sm font-semibold">{t.name}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING / CTA */}
      <section id="pricing" className="container py-16 md:py-24">
        <div className="max-w-2xl mx-auto">
          <Card className="relative overflow-hidden border-primary/30 shadow-2xl shadow-primary/10">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1.5 text-xs font-bold rounded-bl-xl">
              PROMO HARI INI
            </div>
            <CardContent className="pt-10 pb-8 text-center">
              <Badge variant="destructive" className="mb-4">
                <Clock className="h-3 w-3 mr-1" />
                Diskon {DISCOUNT_PERCENT}% berakhir malam ini
              </Badge>
              <h2 className="text-3xl font-bold mb-2">Papan Akrilik Review NFC</h2>
              <p className="text-muted-foreground mb-6">1 kartu NFC + QR Code backup + aktivasi 1 menit</p>

              <div className="flex items-baseline justify-center gap-3 mb-6">
                <span className="text-5xl md:text-6xl font-bold text-primary">{formatRupiah(DISCOUNT_PRICE)}</span>
              </div>
              <div className="text-muted-foreground line-through text-lg mb-6">
                Harga Normal {formatRupiah(ORIGINAL_PRICE)}
              </div>

              <div className="flex flex-col gap-2 text-sm text-left max-w-md mx-auto mb-8">
                {['Akrilik premium 3mm, tahan air & banting', 'Chip NFC NTAG213 original + QR Code', 'Aktivasi via portal online, tanpa aplikasi', 'Garansi chip seumur hidup', 'Support WhatsApp 7 hari/minggu'].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-chart-2 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Button asChild size="lg" className="w-full h-14 text-base font-semibold shadow-xl shadow-primary/30">
                <Link href="/beli">
                  Pesan Sekarang <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full h-12 mt-3">
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> Chat Admin WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/50 mt-8">
        <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/app-icon.png" alt="logo" className="h-8 w-8 rounded-lg" />
            <span className="font-semibold text-sm">NFC Review by shndf1re</span>
          </div>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <Link href="/about" className="hover:text-foreground">Tentang</Link>
            <Link href="/tos" className="hover:text-foreground">Syarat</Link>
            <Link href="/privacy-policy" className="hover:text-foreground">Privasi</Link>
            <Link href="/refund-policy" className="hover:text-foreground">Refund</Link>
            <Link href="/track" className="hover:text-foreground">Lacak</Link>
          </div>
          <div className="text-xs text-muted-foreground">© 2026 NFC Review</div>
        </div>
      </footer>

      {/* ACTIVATE MODAL */}
      <Dialog open={showActivateModal} onOpenChange={setShowActivateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" /> Aktivasi Kartu NFC
            </DialogTitle>
            <DialogDescription>
              Masukkan ID Kartu dan PIN 6-digit yang kami kirim via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVerifyAndRedirect} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cardId">ID Kartu</Label>
              <Input id="cardId" value={cardIdInput} onChange={(e) => setCardIdInput(e.target.value)} placeholder="contoh: ABCD1234" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cardPin">PIN 6-digit</Label>
              <Input id="cardPin" type="password" value={cardPinInput} onChange={(e) => setCardPinInput(e.target.value)} placeholder="••••••" maxLength={6} />
            </div>
            {activateError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {activateError}
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={verifying} className="w-full">
                {verifying ? 'Memverifikasi...' : (<><ArrowRight className="mr-2 h-4 w-4" /> Lanjutkan ke Setup</>)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating WhatsApp */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-2xl transition-all hover:scale-110"
        aria-label="Chat WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}
