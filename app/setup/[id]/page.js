'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Nfc, Store, Link2, KeyRound, ShieldCheck, ArrowLeft, ArrowRight, PlayCircle, ExternalLink, MessageCircle, CheckCircle2,
  RotateCcw, Pencil, Check, Info, Lock, Loader2, AlertCircle, Sparkles,
} from 'lucide-react';
import { Field, TextInput, Btn, Modal, PinField, useToast, Pill } from '@/components/admin/kit';
import { cn } from '@/lib/utils';

const WA_ADMIN = '6285183144404';
const DEFAULT_PIN = '000000';

function formatReviewUrl(url) {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) return '';
  if (cleanUrl.startsWith('ChIJ') && !cleanUrl.includes(' ')) return `https://search.google.com/local/writereview?placeid=${cleanUrl}`;
  const match = cleanUrl.match(/placeid=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return `https://search.google.com/local/writereview?placeid=${match[1]}`;
  return cleanUrl;
}

function Stepper({ step }) {
  const steps = ['Data Toko', 'PIN Default', 'PIN Baru'];
  return (
    <ol className="flex items-center gap-2" data-testid="setup-stepper">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 min-w-0">
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all',
              done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30' : 'bg-muted text-muted-foreground')}>
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </span>
            <span className={cn('truncate text-xs font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
            {n < 3 && <span className={cn('hidden sm:block h-px flex-1', done ? 'bg-emerald-400' : 'bg-border')} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function SetupPage({ params }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const id = resolvedParams?.id;
  const router = useRouter();
  const { showToast, ToastViewport } = useToast();

  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [step, setStep] = useState(1);
  const [storeName, setStoreName] = useState('');
  const [reviewUrl, setReviewUrl] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [changePin, setChangePin] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetPin, setResetPin] = useState('');
  const [resetError, setResetError] = useState('');
  const [success, setSuccess] = useState(null);

  const waHelpUrl = `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(`Halo Admin! Saya butuh bantuan aktivasi / PIN Papan Review Akrilik.\n\n- ID Kartu: ${id || ''}\n\nTerima kasih!`)}`;

  const fetchDevice = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`/api/setup/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) { setLoadError(data.error || 'Gagal memuat data kartu.'); setDevice(null); }
      else {
        setDevice(data.device);
        setStoreName(data.device.label_name || '');
        setReviewUrl(data.device.target_url || '');
      }
    } catch (e) {
      setLoadError('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchDevice(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const validateStep1 = () => {
    if (!storeName.trim()) return 'Nama Toko / Usaha wajib diisi.';
    if (!formatReviewUrl(reviewUrl)) return 'Link Google Review wajib diisi.';
    return '';
  };

  const validateNewPinClient = () => {
    if (!/^\d{6}$/.test(newPin)) return 'PIN baru harus 6 digit angka.';
    if (newPin === DEFAULT_PIN) return 'PIN baru tidak boleh 000000.';
    if (newPin !== newPin2) return 'Konfirmasi PIN baru tidak sama.';
    return '';
  };

  const submitActivate = async () => {
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch(`/api/setup/${encodeURIComponent(id)}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, storeName, reviewUrl, newPin: device?.is_active && !changePin ? '' : newPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Gagal menyimpan.');
        // kalau PIN lama salah, kembalikan ke langkah PIN
        if (res.status === 401 && !device?.is_active) setStep(2);
        return;
      }
      setSuccess({ wasActive: data.wasActive, pinChanged: data.pinChanged, newPin: data.pinChanged ? newPin : null });
      setDevice(data.device);
      setEditMode(false);
    } catch (e) {
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    setFormError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) return setFormError(err);
      setStep(2);
    } else if (step === 2) {
      if (!/^\d{6}$/.test(pin)) return setFormError('Masukkan 6 digit PIN.');
      setStep(3);
    } else {
      const err = validateNewPinClient();
      if (err) return setFormError(err);
      submitActivate();
    }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    const err = validateStep1();
    if (err) return setFormError(err);
    if (!pin) return setFormError('Masukkan PIN Anda untuk konfirmasi.');
    if (changePin) {
      const pErr = validateNewPinClient();
      if (pErr) return setFormError(pErr);
    }
    submitActivate();
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/setup/${encodeURIComponent(id)}/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: resetPin }),
      });
      const data = await res.json();
      if (!res.ok) return setResetError(data.error || 'Gagal mereset.');
      setShowReset(false);
      setResetPin('');
      setStoreName(''); setReviewUrl(''); setPin(''); setNewPin(''); setNewPin2(''); setStep(1); setEditMode(false);
      showToast('Papan berhasil di-reset. PIN kembali ke default 000000.');
      fetchDevice();
    } catch (err) {
      setResetError('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const isActive = Boolean(device?.is_active);

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 via-violet-500/5 to-transparent" />
      <div className="relative mx-auto w-full max-w-lg px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Beranda</Link>
          <a href={waHelpUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"><MessageCircle className="h-4 w-4" /> Bantuan</a>
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-xl shadow-slate-900/[0.04]">
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-border p-5 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-lg shadow-primary/30"><Nfc className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold tracking-tight">{isActive ? 'Papan Review Aktif' : 'Aktivasi Papan Review'}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground" data-testid="setup-device-id">{id}</span>
                {device && (isActive ? <Pill tone="green" dot>Aktif</Pill> : <Pill tone="amber" dot>Belum Aktivasi</Pill>)}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /><span className="text-sm">Memuat data kartu...</span></div>
            ) : loadError ? (
              <div className="py-8 text-center" data-testid="setup-load-error">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10"><AlertCircle className="h-6 w-6" /></div>
                <p className="mt-4 text-sm font-semibold">{loadError}</p>
                <p className="mt-1 text-xs text-muted-foreground">Pastikan link / QR yang Anda buka benar.</p>
                <div className="mt-5 flex justify-center gap-2">
                  <Btn as="a" href="/" variant="outline">Ke Beranda</Btn>
                  <Btn as="a" href={waHelpUrl} target="_blank" rel="noreferrer" variant="success"><MessageCircle /> Hubungi CS</Btn>
                </div>
              </div>
            ) : !isActive ? (
              /* ============ AKTIVASI (3 langkah) ============ */
              <form onSubmit={handleNext} autoComplete="off" className="space-y-5" data-testid="activate-form">
                <Stepper step={step} />

                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2">
                    <Field label="Nama Toko / Usaha">
                      <div className="relative">
                        <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <TextInput data-testid="setup-store-name" className="h-11 pl-9" placeholder="Contoh: Kopi Kenangan Samarinda" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                      </div>
                    </Field>
                    <Field label="Link Google Review">
                      <div className="relative">
                        <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <TextInput data-testid="setup-review-url" className="h-11 pl-9" placeholder="Tempel link review di sini" value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} />
                      </div>
                    </Field>
                    <div className="rounded-2xl border border-border bg-muted/40 p-4">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><b className="text-foreground">Belum punya link review?</b> Cari nama toko Anda di Productmate lalu salin link-nya, atau lihat video panduan.</span></div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Btn as="a" href="https://productmate.com/google-review-link-generator" target="_blank" rel="noopener noreferrer" variant="outline" size="sm"><ExternalLink /> Productmate</Btn>
                        <Btn type="button" variant="outline" size="sm" onClick={() => setShowGuide(true)}><PlayCircle /> Video Panduan</Btn>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2">
                    <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
                      <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div className="text-sm">
                        <div className="font-semibold">Masukkan PIN default</div>
                        <p className="mt-0.5 text-muted-foreground">Kartu baru memakai PIN default <b className="font-mono tracking-widest text-foreground">000000</b>. Jika Anda menerima PIN dari admin via WhatsApp, PIN itu juga bisa dipakai.</p>
                      </div>
                    </div>
                    <Field label="PIN saat ini"><PinField testId="setup-pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></Field>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2">
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div className="text-sm">
                        <div className="font-semibold">Buat PIN baru milik Anda</div>
                        <p className="mt-0.5 text-muted-foreground">PIN ini dipakai untuk mengubah atau me-reset papan nanti. Simpan baik-baik, jangan bagikan ke orang lain.</p>
                      </div>
                    </div>
                    <Field label="PIN baru (6 digit)"><PinField testId="setup-new-pin" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} /></Field>
                    <Field label="Ulangi PIN baru"><PinField testId="setup-new-pin2" autoFocus={false} value={newPin2} onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ''))} /></Field>
                  </div>
                )}

                {formError && <p data-testid="setup-error" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}</p>}

                <div className="flex gap-2 pt-1">
                  {step > 1 && <Btn type="button" variant="outline" size="lg" onClick={() => { setFormError(''); setStep(step - 1); }}><ArrowLeft /> Kembali</Btn>}
                  <Btn data-testid="setup-next" type="submit" variant="gradient" size="lg" className="flex-1" loading={submitting}>
                    {step < 3 ? <>Lanjut <ArrowRight /></> : <><Sparkles /> Aktifkan Papan</>}
                  </Btn>
                </div>
              </form>
            ) : !editMode ? (
              /* ============ SUDAH AKTIF ============ */
              <div className="space-y-4" data-testid="active-view">
                <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Store className="h-5 w-5" /></div>
                    <div className="min-w-0"><div className="text-xs text-muted-foreground">Terhubung ke toko</div><div className="truncate font-semibold">{device.label_name || '-'}</div></div>
                  </div>
                  {device.target_url && <a href={device.target_url} target="_blank" rel="noreferrer" className="block truncate rounded-lg bg-card px-3 py-2 text-xs text-primary ring-1 ring-border">{device.target_url}</a>}
                </div>
                <p className="text-sm text-muted-foreground">Papan ini sudah aktif. Pelanggan yang tap NFC / scan QR akan langsung diarahkan ke halaman Google Review toko Anda.</p>
                <div className="grid grid-cols-2 gap-2">
                  <Btn data-testid="setup-edit-btn" variant="outline" size="lg" onClick={() => { setEditMode(true); setPin(''); setFormError(''); setChangePin(false); setNewPin(''); setNewPin2(''); }}><Pencil /> Ubah Data</Btn>
                  <Btn data-testid="setup-reset-btn" variant="danger-soft" size="lg" className="border border-rose-200 dark:border-rose-500/30" onClick={() => { setShowReset(true); setResetPin(''); setResetError(''); }}><RotateCcw /> Reset</Btn>
                </div>
              </div>
            ) : (
              /* ============ EDIT (sudah aktif) ============ */
              <form onSubmit={handleEditSubmit} autoComplete="off" className="space-y-4" data-testid="edit-form">
                <Field label="Nama Toko / Usaha"><TextInput className="h-11" value={storeName} onChange={(e) => setStoreName(e.target.value)} /></Field>
                <Field label="Link Google Review"><TextInput className="h-11" value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} /></Field>
                <Field label="PIN Anda"><PinField testId="edit-pin" autoFocus={false} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></Field>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                  <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={changePin} onChange={(e) => setChangePin(e.target.checked)} /> Ganti PIN juga
                </label>
                {changePin && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="PIN baru"><PinField autoFocus={false} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} /></Field>
                    <Field label="Ulangi"><PinField autoFocus={false} value={newPin2} onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ''))} /></Field>
                  </div>
                )}
                {formError && <p data-testid="setup-error" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}</p>}
                <div className="flex gap-2">
                  <Btn type="button" variant="outline" size="lg" onClick={() => { setEditMode(false); setStoreName(device.label_name || ''); setReviewUrl(device.target_url || ''); setFormError(''); }}>Batal</Btn>
                  <Btn type="submit" variant="gradient" size="lg" className="flex-1" loading={submitting} data-testid="edit-submit"><Lock /> Simpan Perubahan</Btn>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">Lupa PIN? <a href={waHelpUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary">Hubungi CS via WhatsApp</a></p>
      </div>

      {/* SUKSES */}
      <Modal open={Boolean(success)} onClose={() => setSuccess(null)} icon={CheckCircle2} tone="emerald" title={success?.wasActive ? 'Perubahan Tersimpan' : 'Aktivasi Berhasil!'} description={`Papan Google Review untuk ${storeName} siap digunakan. Pelanggan kini bisa langsung tap NFC atau scan QR.`} testId="setup-success">
        {success?.newPin && (
          <div className="mb-4 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.05] p-4 text-center">
            <div className="text-xs text-muted-foreground">PIN baru Anda</div>
            <div className="mt-1 font-mono text-3xl font-bold tracking-[0.4em] text-primary" data-testid="setup-success-pin">{success.newPin}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Screenshot / catat PIN ini untuk ubah data nanti.</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="outline" onClick={() => setSuccess(null)}>Tutup</Btn>
          <Btn variant="gradient" onClick={() => router.push('/')}>Ke Beranda</Btn>
        </div>
      </Modal>

      {/* PANDUAN VIDEO */}
      <Modal open={showGuide} onClose={() => setShowGuide(false)} icon={PlayCircle} title="Cara Dapatkan Link Review" size="md">
        <div className="overflow-hidden rounded-2xl bg-slate-900"><video src="/tutorial-google-review.MP4" autoPlay loop muted playsInline className="block h-auto w-full" /></div>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Buka aplikasi <b className="text-foreground">Google Maps</b> di HP Anda.</li>
          <li>Cari dan pilih nama <b className="text-foreground">Toko / Usaha</b> Anda.</li>
          <li>Geser ke tab <b className="text-foreground">Ulasan (Reviews)</b>.</li>
          <li>Klik <b className="text-foreground">Bagikan Form Ulasan</b>.</li>
          <li>Pilih <b className="text-foreground">Salin Link</b> lalu tempel di kolom link.</li>
        </ol>
        <Btn className="mt-5 w-full" onClick={() => setShowGuide(false)}>Saya Mengerti</Btn>
      </Modal>

      {/* RESET */}
      <Modal open={showReset} onClose={() => setShowReset(false)} icon={RotateCcw} tone="rose" title="Reset Papan?" description="Data toko akan dihapus dan PIN kembali ke default 000000. Masukkan PIN Anda untuk konfirmasi." testId="setup-reset-modal">
        <form onSubmit={handleReset} autoComplete="off" className="space-y-4">
          <PinField testId="reset-pin" danger value={resetPin} onChange={(e) => setResetPin(e.target.value.replace(/\D/g, ''))} />
          {resetError && <p data-testid="reset-error" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{resetError}</p>}
          <div className="flex gap-2">
            <Btn type="button" variant="outline" className="flex-1" onClick={() => setShowReset(false)}>Batal</Btn>
            <Btn type="submit" variant="danger" className="flex-1" loading={submitting} data-testid="reset-submit">Ya, Reset</Btn>
          </div>
        </form>
      </Modal>

      <ToastViewport />
    </div>
  );
}
