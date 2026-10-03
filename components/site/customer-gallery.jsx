'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Expand, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

// Galeri foto papan terpasang di toko pelanggan + lightbox (swipe-friendly)
export default function CustomerGallery({ items = [] }) {
  const [open, setOpen] = useState(-1);
  const close = () => setOpen(-1);
  const prev = () => setOpen((i) => (i - 1 + items.length) % items.length);
  const next = () => setOpen((i) => (i + 1) % items.length);

  useEffect(() => {
    if (open < 0) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  let touchX = 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" data-testid="customer-gallery">
        {items.map((it, i) => (
          <button
            key={it.src}
            type="button"
            data-testid={`gallery-item-${i}`}
            onClick={() => setOpen(i)}
            className={cn('group relative overflow-hidden rounded-2xl border border-border bg-muted text-left shadow-sm', i === 0 && 'col-span-2 lg:row-span-2', i > 0 && i === items.length - 1 && items.length % 2 === 0 && 'col-span-2 lg:col-span-1')}
          >
            <img src={it.src} alt={it.title} loading="lazy" className={cn('w-full object-cover transition-transform duration-500 group-hover:scale-105', i === 0 ? 'aspect-square' : i === items.length - 1 && items.length % 2 === 0 ? 'aspect-video lg:aspect-[4/5]' : 'aspect-[4/5]')} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
              <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-90"><Store className="h-3 w-3" /> {it.category}</div>
              <div className="text-sm font-semibold leading-tight">{it.title}</div>
            </div>
            <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-900 opacity-0 shadow transition-opacity group-hover:opacity-100"><Expand className="h-4 w-4" /></span>
          </button>
        ))}
      </div>

      {open >= 0 && items[open] && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm animate-in fade-in-0"
          onClick={close}
          onTouchStart={(e) => { touchX = e.touches[0].clientX; }}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 50) { dx > 0 ? prev() : next(); } }}
          data-testid="gallery-lightbox"
        >
          <button onClick={close} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Tutup"><X className="h-5 w-5" /></button>
          {items.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 sm:block" aria-label="Sebelumnya"><ChevronLeft className="h-5 w-5" /></button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 sm:block" aria-label="Berikutnya"><ChevronRight className="h-5 w-5" /></button>
            </>
          )}
          <figure className="max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <img src={items[open].src} alt={items[open].title} className="max-h-[75vh] w-auto rounded-2xl object-contain shadow-2xl" />
            <figcaption className="mt-4 text-center text-white">
              <div className="font-semibold">{items[open].title}</div>
              <div className="text-xs text-white/70">{items[open].category} · {open + 1} / {items.length}</div>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
