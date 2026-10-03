import Link from 'next/link';
import { Compass, Home, Search } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/site/site-shell';

export const metadata = { title: 'Halaman Tidak Ditemukan - NFC Review' };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteNav />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="relative max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-lg shadow-primary/30"><Compass className="h-8 w-8" /></div>
          <div className="mt-6 text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">404</div>
          <h1 className="mt-2 text-xl font-bold">Halaman tidak ditemukan</h1>
          <p className="mt-2 text-sm text-muted-foreground">Link yang Anda buka mungkin salah ketik atau sudah tidak tersedia.</p>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90"><Home className="h-4 w-4" /> Ke Beranda</Link>
            <Link href="/track" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold shadow-sm hover:bg-accent"><Search className="h-4 w-4" /> Lacak Pesanan</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
