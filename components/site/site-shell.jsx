import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

// Navbar + footer seragam untuk halaman publik (about, 404, dll)
export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <img src="/app-icon.png" alt="logo" className="h-9 w-9 rounded-xl" />
          <span className="text-base font-bold tracking-tight">NFC Review<span className="text-primary">.</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium shadow-sm hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <img src="/app-icon.png" alt="logo" className="h-7 w-7 rounded-lg" />
          <span>© 2026 NFC Review by shndf1re</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link href="/about" className="hover:text-foreground">Tentang</Link>
          <Link href="/tos" className="hover:text-foreground">Syarat</Link>
          <Link href="/privacy-policy" className="hover:text-foreground">Privasi</Link>
          <Link href="/refund-policy" className="hover:text-foreground">Refund</Link>
          <Link href="/track" className="hover:text-foreground">Lacak</Link>
        </div>
      </div>
    </footer>
  );
}
