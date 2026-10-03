'use client';

import { useState } from 'react';
import { Truck, MapPin, CheckCircle2, Loader2, AlertCircle, RefreshCw, PackageCheck, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const fmt = (d) => {
  if (!d) return '';
  const t = new Date(String(d).replace(' ', 'T'));
  return isNaN(t) ? d : t.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// Timeline posisi paket. Dipakai di /track (pembeli) & /admin/sales (modal).
export function ResiTimeline({ data }) {
  if (!data) return null;
  if (!data.ok) {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" data-testid="resi-error">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {data.message}
      </div>
    );
  }
  const { summary, detail, history = [], delivered } = data;
  return (
    <div className="space-y-4" data-testid="resi-timeline">
      <div className={cn('flex items-center gap-3 rounded-2xl p-4', delivered ? 'bg-emerald-500/10' : 'bg-primary/[0.07]')}>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md', delivered ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-gradient-to-br from-primary to-violet-500 shadow-primary/30')}>
          {delivered ? <PackageCheck className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <div className={cn('text-sm font-bold', delivered ? 'text-emerald-700 dark:text-emerald-300' : 'text-primary')}>{delivered ? 'Paket sudah diterima' : (summary.status || 'Dalam pengiriman')}</div>
          <div className="truncate text-xs text-muted-foreground">{summary.courier} {summary.service && `· ${summary.service}`} · <span className="font-mono">{summary.awb}</span></div>
        </div>
      </div>

      {(detail.origin || detail.destination) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-border p-3"><div className="text-muted-foreground">Dari</div><div className="mt-0.5 font-semibold">{detail.origin || '-'}</div></div>
          <div className="rounded-xl border border-border p-3"><div className="text-muted-foreground">Tujuan</div><div className="mt-0.5 font-semibold">{detail.destination || '-'}</div></div>
        </div>
      )}

      {history.length > 0 ? (
        <ol className="relative space-y-4 pl-6">
          <span className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-border" />
          {history.map((h, i) => (
            <li key={i} className="relative">
              <span className={cn('absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-card', i === 0 ? (delivered ? 'bg-emerald-500' : 'bg-primary') : 'bg-muted-foreground/30')}>
                {i === 0 ? <CheckCircle2 className="h-3 w-3 text-white" /> : <Circle className="h-1.5 w-1.5 fill-current text-transparent" />}
              </span>
              <div className={cn('text-sm', i === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{h.desc}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                <span>{fmt(h.date)}</span>
                {h.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{h.location}</span>}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada riwayat perjalanan dari kurir.</p>
      )}
    </div>
  );
}

export function useResiTracker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const track = async ({ resi, courier, orderDbId }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/resi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resi, courier, orderDbId }) });
      setData(await res.json());
    } catch (e) {
      setData({ ok: false, message: 'Gagal menghubungi server.' });
    } finally {
      setLoading(false);
    }
  };
  return { data, loading, track, reset: () => setData(null) };
}

// Tombol + panel inline (untuk kartu order di /track)
export function ResiTrackerInline({ resi, courier, orderDbId }) {
  const { data, loading, track } = useResiTracker();
  return (
    <div className="space-y-3">
      <button
        type="button"
        data-testid="track-resi-btn"
        onClick={() => track({ resi, courier, orderDbId })}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 disabled:opacity-60"
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : data ? <RefreshCw className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
        {loading ? 'Melacak paket...' : data ? 'Perbarui Posisi Paket' : 'Lacak Posisi Paket'}
      </button>
      <ResiTimeline data={data} />
    </div>
  );
}
