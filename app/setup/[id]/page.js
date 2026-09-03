'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SetupPage({ params }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const id = resolvedParams?.id;

  const router = useRouter();

  const [device, setDevice] = useState(null);
  const [storeName, setStoreName] = useState('');
  const [reviewUrl, setReviewUrl] = useState('');
  const [pinInput, setPinInput] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [modalError, setModalError] = useState('');

  // KONFIGURASI BANTUAN WHATSAPP ADMIN
  const waAdminNumber = '6281234567890'; 
  const waHelpMessage = `Halo Admin! Saya baru saja membeli Papan Review Akrilik.\n\nSaya ingin meminta PIN Akses untuk aktivasi:\n- ID Kartu: ${id || ''}\n\nMohon bantuannya ya, terima kasih!`;
  const waHelpUrl = `https://wa.me/${waAdminNumber}?text=${encodeURIComponent(waHelpMessage)}`;

  useEffect(() => {
    if (id) {
      fetchDevice();
    }
  }, [id]);

  const fetchDevice = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        setMessage({ type: 'error', text: 'Gagal memuat data kartu dari database.' });
      } else if (!data) {
        setMessage({ type: 'error', text: 'ID Kartu tidak ditemukan di sistem.' });
      } else {
        setDevice(data);
        if (data.label_name) setStoreName(data.label_name);
        if (data.target_url) setReviewUrl(data.target_url);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setLoading(false);
    }
  };

  const formatReviewUrl = (url) => {
    let cleanUrl = url.trim();
    if (!cleanUrl) return '';
    if (cleanUrl.startsWith('ChIJ') && !cleanUrl.includes(' ')) {
      return `https://search.google.com/local/writereview?placeid=${cleanUrl}`;
    }
    const match = cleanUrl.match(/placeid=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://search.google.com/local/writereview?placeid=${match[1]}`;
    }
    return cleanUrl;
  };

  const handleOpenPinModal = (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setModalError('');

    if (!storeName.trim()) {
      setMessage({ type: 'error', text: '❌ Nama Toko / Usaha wajib diisi!' });
      return;
    }

    const formattedUrl = formatReviewUrl(reviewUrl);
    if (!formattedUrl) {
      setMessage({ type: 'error', text: '❌ Link Google Review wajib diisi!' });
      return;
    }

    setShowPinModal(true);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!device) {
      setModalError('Kartu tidak valid.');
      return;
    }

    const inputPinClean = String(pinInput).trim();
    const devicePinClean = String(device.pin).trim();

    if (inputPinClean !== devicePinClean) {
      setModalError('❌ PIN Kartu Salah! Periksa pesan WA dari kami.');
      return;
    }

    const formattedUrl = formatReviewUrl(reviewUrl);
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('devices')
        .update({
          label_name: storeName.trim() || null,
          target_url: formattedUrl,
          is_active: true
        })
        .eq('id', id);

      if (error) {
        setModalError('❌ Gagal memperbarui data: ' + error.message);
      } else {
        setShowPinModal(false);
        setMessage({ type: 'success', text: '🎉 Papan Akrilik Anda Berhasil Diaktifkan!' });
        setTimeout(() => {
          router.push(`/r/${id}`);
        }, 1800);
      }
    } catch (err) {
      setModalError('❌ Terjadi kesalahan saat menyimpan.');
    } finally {
      setSubmitting(false);
    }
  };

  // FUNGSI EKSEKUSI RESET KARTU MENJADI BELUM AKTIF
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!device) {
      setModalError('Kartu tidak valid.');
      return;
    }

    const inputPinClean = String(pinInput).trim();
    const devicePinClean = String(device.pin).trim();

    if (inputPinClean !== devicePinClean) {
      setModalError('❌ PIN Kartu Salah!');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('devices')
        .update({
          label_name: null,
          target_url: null,
          is_active: false
        })
        .eq('id', id);

      if (error) {
        setModalError('❌ Gagal mereset kartu: ' + error.message);
      } else {
        setShowResetModal(false);
        setPinInput('');
        setStoreName('');
        setReviewUrl('');
        setMessage({ type: 'success', text: '🔄 Papan berhasil di-reset menjadi Belum Dipakai.' });
        fetchDevice();
      }
    } catch (err) {
      setModalError('❌ Terjadi kesalahan jaringan saat mereset.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '16px', fontFamily: '-apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔄</div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>Memuat halaman aktivasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '24px 16px', boxSizing: 'border-box', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', borderRadius: '18px', padding: '28px 22px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '52px', height: '52px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', marginBottom: '12px' }}>
            📲
          </div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Aktivasi Papan Review</h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>ID Kartu: <strong>{id}</strong></span>
            {device && (
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', backgroundColor: device.is_active ? '#dcfce7' : '#fef3c7', color: device.is_active ? '#15803d' : '#b45309', fontWeight: '700' }}>
                {device.is_active ? 'Sudah Aktif' : 'Belum Dipakai'}
              </span>
            )}
          </div>
        </div>

        {/* NOTIFIKASI UTAMA */}
        {message.text && (
          <div style={{
            padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', marginBottom: '18px', textAlign: 'center',
            backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
            color: message.type === 'error' ? '#dc2626' : '#15803d',
            border: message.type === 'error' ? '1px solid #fca5a5' : '1px solid #86efac'
          }}>
            {message.text}
          </div>
        )}

        {device ? (
          <form onSubmit={handleOpenPinModal} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* INPUT NAMA TOKO */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                🏪 Nama Toko / Usaha Kakak
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Kopi Kenangan Samarinda"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {/* INPUT LINK REVIEW & TOMBOL PRODUCTMATE */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                🔗 Link Direct Google Review
              </label>

              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px', borderRadius: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: '#0369a1', lineHeight: '1.4', marginBottom: '8px' }}>
                  💡 <strong>Belum punya link direct review?</strong><br />
                  Klik tombol di bawah untuk cari nama toko Anda di Productmate, lalu <strong>salin link</strong> yang muncul.
                </div>
                <a 
                  href="https://productmate.com/google-review-link-generator" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    width: '100%', padding: '8px 12px', backgroundColor: '#0284c7', color: '#ffffff',
                    borderRadius: '8px', fontSize: '12px', fontWeight: '700', textDecoration: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  🔍 Cari Link Toko di Productmate ↗
                </a>
              </div>

              <input
                type="text"
                required
                placeholder="Paste link Google Review hasil dari Productmate di sini"
                value={reviewUrl}
                onChange={(e) => setReviewUrl(e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {/* SUBMIT BUTTON (MEMBUKA MODAL PIN) */}
            <button
              type="submit"
              style={{
                width: '100%', padding: '14px', backgroundColor: '#2563eb',
                color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px',
                cursor: 'pointer', marginTop: '4px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}
            >
              🚀 Simpan &amp; Aktifkan Papan
            </button>

            {/* TOMBOL RESET KARTU (HANYA MUNCUL JIKA KARTU SUDAH AKTIF) */}
            {device.is_active && (
              <button
                type="button"
                onClick={() => { setPinInput(''); setModalError(''); setShowResetModal(true); }}
                style={{
                  width: '100%', padding: '10px', backgroundColor: '#fef2f2',
                  color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '10px',
                  fontWeight: '600', fontSize: '12px', cursor: 'pointer'
                }}
              >
                🔄 Reset Papan (Nonaktifkan &amp; Hapus Data Toko)
              </button>
            )}

            {/* BOX BANTUAN WHATSAPP DI HALAMAN UTAMA */}
            <div style={{ marginTop: '12px', textAlign: 'center', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0', fontWeight: '500' }}>
                Belum menerima PIN atau butuh bantuan?
              </p>
              <a
                href={waHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  boxSizing: 'border-box'
                }}
              >
                💬 Hubungi Admin via WA untuk Minta PIN ↗
              </a>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <Link href="/" style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#334155', textDecoration: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '600', display: 'inline-block' }}>
              ⬅️ Kembali ke Halaman Utama
            </Link>
          </div>
        )}

      </div>

      {/* MODAL KONFIRMASI PIN AKTIVASI */}
      {showPinModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
        }}>
          <div style={{
            width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '18px',
            padding: '24px 20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', textAlign: 'center'
          }}>
            <div style={{ width: '44px', height: '44px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '10px' }}>
              🔑
            </div>
            
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
              Konfirmasi PIN Akses
            </h3>

            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              Masukkan <strong>6-Digit PIN Akses</strong> yang kami kirimkan melalui pesan WhatsApp untuk memverifikasi kepemilikan papan.
            </p>

            <form onSubmit={handleFinalSubmit} autoComplete="off">
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="password"
                  required
                  autoFocus
                  maxLength={6}
                  autoComplete="new-password"
                  placeholder="••••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', fontSize: '18px', textAlign: 'center',
                    letterSpacing: '6px', borderRadius: '10px', border: '1px solid #cbd5e1',
                    boxSizing: 'border-box', backgroundColor: '#f8fafc', outline: 'none'
                  }}
                />
              </div>

              {modalError && (
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                  {modalError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => { setShowPinModal(false); setPinInput(''); setModalError(''); }}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '12px', backgroundColor: submitting ? '#94a3b8' : '#2563eb',
                    color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Memproses...' : 'Konfirmasi & Aktifkan'}
                </button>
              </div>

              <div style={{ paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                <a
                  href={waHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }}
                >
                  💬 Belum dapat PIN? Hubungi WA Admin ↗
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI RESET KARTU */}
      {showResetModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
        }}>
          <div style={{
            width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '18px',
            padding: '24px 20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #fca5a5', textAlign: 'center'
          }}>
            <div style={{ width: '44px', height: '44px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '10px' }}>
              ⚠️
            </div>
            
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '700', color: '#991b1b' }}>
              Reset Papan Akrilik?
            </h3>

            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              Papan ini akan dikembalikan ke kondisi <strong>Belum Dipakai</strong>. Masukkan PIN Akses untuk konfirmasi:
            </p>

            <form onSubmit={handleResetSubmit} autoComplete="off">
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="password"
                  required
                  autoFocus
                  maxLength={6}
                  autoComplete="new-password"
                  placeholder="••••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', fontSize: '18px', textAlign: 'center',
                    letterSpacing: '6px', borderRadius: '10px', border: '1px solid #fca5a5',
                    boxSizing: 'border-box', backgroundColor: '#fff5f5', outline: 'none'
                  }}
                />
              </div>

              {modalError && (
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                  {modalError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setShowResetModal(false); setPinInput(''); setModalError(''); }}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '12px', backgroundColor: submitting ? '#94a3b8' : '#dc2626',
                    color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Mereset...' : 'Ya, Reset Papan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
