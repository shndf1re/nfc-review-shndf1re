'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart3, Activity, Nfc, QrCode, Trophy, RefreshCw, Trash2, Search, Store, Eraser, Clock } from 'lucide-react';
import {
  PageContainer, PageHeader, Panel, KpiCard, Pill, Field, TextInput, Btn, Modal, PinField, useToast, EmptyState, Skeleton, Th, Td,
} from '@/components/admin/kit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const EMPTY_PIN = { isOpen: false, actionType: null, targetDeviceId: null, pinInput: '', errorMsg: '', isSubmitting: false };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

export default function StatsPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [stats, setStats] = useState([]);
  const [topDevices, setTopDevices] = useState([]);
  const [totalScans, setTotalScans] = useState(0);
  const [nfcCount, setNfcCount] = useState(0);
  const [qrCount, setQrCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [pinModal, setPinModal] = useState(EMPTY_PIN);
  const { showToast, ToastViewport } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    const { data: statsData, error: statsErr } = await supabase
      .from('device_stats')
      .select('device_id, type, created_at')
      .order('created_at', { ascending: false });
    const { data: devicesData } = await supabase.from('devices').select('id, label_name');

    const deviceMap = {};
    (devicesData || []).forEach((d) => { deviceMap[d.id] = d.label_name || null; });

    if (!statsErr && statsData) {
      setTotalScans(statsData.length);
      let totalNfc = 0;
      let totalQr = 0;
      const grouped = {};
      statsData.forEach((curr) => {
        const rawId = curr.device_id ? String(curr.device_id).trim() : 'Unknown';
        if (!grouped[rawId]) grouped[rawId] = { id: rawId, labelName: deviceMap[rawId] || null, nfc: 0, qr: 0, total: 0, lastScan: curr.created_at };
        if ((curr.type || '').toLowerCase() === 'nfc') { grouped[rawId].nfc += 1; totalNfc += 1; }
        else { grouped[rawId].qr += 1; totalQr += 1; }
        grouped[rawId].total += 1;
      });
      const list = Object.values(grouped);
      setNfcCount(totalNfc);
      setQrCount(totalQr);
      setStats(list);
      setTopDevices([...list].sort((a, b) => b.total - a.total).slice(0, 5));
    } else {
      setStats([]); setTopDevices([]); setTotalScans(0); setNfcCount(0); setQrCount(0);
    }
    setLoading(false);
  };

  // AUTH GUARD - cek sesi via httpOnly cookie
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setIsAuthed(true);
        else window.location.href = '/admin?reason=login_required';
      })
      .catch(() => { window.location.href = '/admin?reason=login_required'; })
      .finally(() => setAuthChecked(true));
  }, []);

  // REALTIME LISTENER SUPABASE
  useEffect(() => {
    if (!isAuthed) return;
    fetchStats();
    const channel = supabase
      .channel('stats-realtime-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_stats' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => fetchStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return [...stats]
      .filter((s) => s.id.toLowerCase().includes(q) || (s.labelName || '').toLowerCase().includes(q))
      .sort((a, b) => b.total - a.total);
  }, [stats, query]);

  const handleModalAction = async (e) => {
    e.preventDefault();
    setPinModal((prev) => ({ ...prev, isSubmitting: true, errorMsg: '' }));
    const { data: verifyRes, error: rpcErr } = await supabase.rpc('verify_sales_pin', { input_pin: pinModal.pinInput.trim() });
    // RPC mengembalikan array [{ is_valid, user_role }]
    const isValid = Array.isArray(verifyRes) ? verifyRes[0]?.is_valid === true : verifyRes === true;
    if (rpcErr || !isValid) {
      setPinModal((prev) => ({ ...prev, isSubmitting: false, errorMsg: 'PIN Admin salah atau tidak valid.' }));
      return;
    }
    if (pinModal.actionType === 'resetAll') {
      const { error } = await supabase.rpc('reset_device_stats');
      if (error) return setPinModal((prev) => ({ ...prev, isSubmitting: false, errorMsg: 'Gagal database: ' + error.message }));
      showToast('Semua statistik interaksi berhasil di-reset.');
    } else if (pinModal.actionType === 'resetSingle') {
      const targetId = pinModal.targetDeviceId;
      const { error } = await supabase.rpc('reset_device_stats', { target_device_id: targetId });
      if (error) return setPinModal((prev) => ({ ...prev, isSubmitting: false, errorMsg: 'Gagal database: ' + error.message }));
      showToast(`Statistik kartu ${targetId} berhasil di-reset.`);
    }
    setPinModal(EMPTY_PIN);
    fetchStats();
  };

  if (!authChecked) {
    return <PageContainer><Skeleton className="h-10 w-64" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div></PageContainer>;
  }
  if (!isAuthed) return null;

  const nfcPct = totalScans ? Math.round((nfcCount / totalScans) * 100) : 0;
  const qrPct = totalScans ? 100 - nfcPct : 0;
  const maxTop = topDevices[0]?.total || 1;

  return (
    <PageContainer>
      <PageHeader
        icon={BarChart3}
        eyebrow="Analitik Realtime"
        title="Statistik Interaksi"
        description="Analisis Tap NFC vs Scan QR untuk setiap papan akrilik."
        actions={
          <>
            <Btn variant="outline" onClick={fetchStats} data-testid="stats-refresh"><RefreshCw /> Refresh</Btn>
            {stats.length > 0 && (
              <Btn variant="danger-soft" className="border border-rose-200 dark:border-rose-500/30" onClick={() => setPinModal({ ...EMPTY_PIN, isOpen: true, actionType: 'resetAll' })} data-testid="stats-reset-all"><Eraser /> Reset Semua</Btn>
            )}
          </>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard testId="kpi-total" label="Total Interaksi" value={loading ? '—' : totalScans.toLocaleString('id-ID')} icon={Activity} tone="indigo" hint="Semua tap & scan" />
        <KpiCard testId="kpi-nfc" label="Tap NFC" value={loading ? '—' : nfcCount.toLocaleString('id-ID')} icon={Nfc} tone="violet" hint={`${nfcPct}% dari total`} />
        <KpiCard testId="kpi-qr" label="Scan QR" value={loading ? '—' : qrCount.toLocaleString('id-ID')} icon={QrCode} tone="amber" hint={`${qrPct}% dari total`} />
        <KpiCard testId="kpi-devices" label="Kartu Terpakai" value={loading ? '—' : stats.length} suffix="kartu" icon={Store} tone="emerald" hint="Punya minimal 1 interaksi" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Channel split */}
        <Panel className="lg:col-span-2" title="Komposisi Channel" description="Perbandingan cara pelanggan membuka review">
          {loading ? <Skeleton className="h-32" /> : (
            <div className="space-y-5">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-gradient-to-r from-primary to-violet-500 transition-all" style={{ width: `${nfcPct}%` }} />
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${qrPct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> NFC</div>
                  <div className="mt-1.5 text-2xl font-bold tabular-nums">{nfcPct}%</div>
                  <div className="text-xs text-muted-foreground">{nfcCount} tap</div>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> QR Code</div>
                  <div className="mt-1.5 text-2xl font-bold tabular-nums">{qrPct}%</div>
                  <div className="text-xs text-muted-foreground">{qrCount} scan</div>
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* Top devices */}
        <Panel className="lg:col-span-3" title="Top Performing Devices" description="5 toko dengan interaksi terbanyak" actions={<Trophy className="h-4 w-4 text-amber-500" />}>
          {loading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : topDevices.length === 0 ? (
            <EmptyState icon={Trophy} title="Belum ada peringkat" description="Data muncul setelah ada tap/scan pertama." />
          ) : (
            <ol className="space-y-3.5" data-testid="top-devices">
              {topDevices.map((dev, idx) => (
                <li key={dev.id} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : idx === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200' : idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' : 'bg-muted text-muted-foreground'}`}>#{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{dev.labelName || dev.id}</span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-primary">{dev.total}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500" style={{ width: `${(dev.total / maxTop) * 100}%` }} />
                    </div>
                    {dev.labelName && <div className="mt-1 font-mono text-[11px] text-muted-foreground">{dev.id}</div>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {/* Details */}
      <Panel noPadding title="Rincian Per Kartu Akrilik" description={`${filtered.length} kartu dengan interaksi`}>
        <div className="border-b border-border p-4 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <TextInput data-testid="stats-search" placeholder="Cari ID kartu atau nama toko..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Activity} title="Belum ada interaksi" description="Belum ada scan/tap yang tercatat." />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40">
                  <tr><Th>ID Kartu</Th><Th>Toko</Th><Th className="text-right">NFC</Th><Th className="text-right">QR</Th><Th className="text-right">Total</Th><Th>Terakhir</Th><Th className="text-right">Aksi</Th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors" data-testid={`stat-row-${item.id}`}>
                      <Td className="font-mono text-[13px] font-semibold">{item.id}</Td>
                      <Td>{item.labelName ? <span className="font-medium">{item.labelName}</span> : <span className="text-xs italic text-muted-foreground">Belum set nama toko</span>}</Td>
                      <Td className="text-right tabular-nums">{item.nfc}</Td>
                      <Td className="text-right tabular-nums">{item.qr}</Td>
                      <Td className="text-right"><Pill tone="indigo">{item.total}</Pill></Td>
                      <Td className="text-xs text-muted-foreground">{fmtDate(item.lastScan)}</Td>
                      <Td className="text-right"><Btn variant="danger-soft" size="icon" title="Reset statistik kartu ini" onClick={() => setPinModal({ ...EMPTY_PIN, isOpen: true, actionType: 'resetSingle', targetDeviceId: item.id })}><Trash2 /></Btn></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-border">
              {filtered.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold">{item.id}</div>
                      {item.labelName ? <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-primary"><Store className="h-3.5 w-3.5" /> {item.labelName}</div> : <div className="mt-0.5 text-xs italic text-muted-foreground">Belum set nama toko</div>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Pill tone="indigo">{item.total} scan</Pill>
                      <Btn variant="danger-soft" size="icon" onClick={() => setPinModal({ ...EMPTY_PIN, isOpen: true, actionType: 'resetSingle', targetDeviceId: item.id })}><Trash2 /></Btn>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1"><Nfc className="h-3.5 w-3.5 text-primary" /> NFC <b className="text-foreground">{item.nfc}</b></span>
                      <span className="flex items-center gap-1"><QrCode className="h-3.5 w-3.5 text-amber-500" /> QR <b className="text-foreground">{item.qr}</b></span>
                    </div>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmtDate(item.lastScan)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>

      <Modal
        open={pinModal.isOpen}
        onClose={() => setPinModal(EMPTY_PIN)}
        icon={Eraser}
        tone="rose"
        title={pinModal.actionType === 'resetAll' ? 'Reset Semua Statistik' : `Reset Statistik · ${pinModal.targetDeviceId || ''}`}
        description="Masukkan PIN / Password Admin untuk mengonfirmasi penghapusan data ini."
        testId="stats-pin-modal"
      >
        <form onSubmit={handleModalAction} autoComplete="off" className="space-y-4">
          <Field label="PIN Admin"><PinField testId="stats-pin-input" maxLength={64} danger value={pinModal.pinInput} onChange={(e) => setPinModal((prev) => ({ ...prev, pinInput: e.target.value }))} /></Field>
          {pinModal.errorMsg && <p data-testid="stats-pin-error" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{pinModal.errorMsg}</p>}
          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="outline" className="flex-1" onClick={() => setPinModal(EMPTY_PIN)}>Batal</Btn>
            <Btn type="submit" variant="danger" className="flex-1" loading={pinModal.isSubmitting} data-testid="stats-pin-submit">Ya, Reset Data</Btn>
          </div>
        </form>
      </Modal>

      <ToastViewport />
    </PageContainer>
  );
}
