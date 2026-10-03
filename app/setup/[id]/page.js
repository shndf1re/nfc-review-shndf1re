'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

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
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Modal Sukses Baru
  const [message, setMessage] = useState({ type: '', text: '' });
  const [modalError, setModalError] = useState('');

  const waAdminNumber = '6285183144404'; 
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
        setShowSuccessModal(true); // Tampilkan Pop-Up Sukses

        // Pengalihan Otomatis ke Landing Page Utama setelah 2.5 Detik
        setTimeout(() => {
          router.push('/');
        }, 2500);
      }
    } catch (err) {
      setModalError('❌ Terjadi kesalahan saat menyimpan.');
    } finally {
      setSubmitting(false);
    }
  };

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
        setMessage({ type: 'success', text: '🔄 Papan berhasil di-reset.' });
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
      <div className={inter.className} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Memuat Sistem...</p>
        </div>
        <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className={inter.className} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '24px 16px', boxSizing: 'border-box' }}>
      
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
        
        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#64748b', textDecoration: 'none', padding: '8px 12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            ⬅️ Batal &amp; Kembali
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '60px', height: '60px', backgroundColor: '#0f172a', color: '#ffffff', borderRadius: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '16px', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.1)' }}>
            📲
          </div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Device Setup</h2>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace', fontWeight: '500' }}>{id}</span>
            
            {device && (
              <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', backgroundColor: device.is_active ? '#ecfdf5' : '#f8fafc', color: device.is_active ? '#059669' : '#64748b', fontWeight: '700', letterSpacing: '0.3px' }}>
                {device.is_active ? 'Aktif' : 'Belum Aktivasi'}
              </span>
            )}
          </div>
        </div>

        {message.text && (
          <div style={{
            padding: '14px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', marginBottom: '24px', textAlign: 'center',
            backgroundColor: message.type === 'error' ? '#fef2f2' : '#ecfdf5',
            color: message.type === 'error' ? '#dc2626' : '#059669',
            border: message.type === 'error' ? '1px solid #fee2e2' : '1px solid #d1fae5'
          }}>
            {message.text}
          </div>
        )}

        {device ? (
          <form onSubmit={handleOpenPinModal} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                🏪 Nama Toko / Usaha
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Kopi Kenangan Samarinda"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', fontSize: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  🔗 Link Direct Google Review
                </label>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                >
                  🎬 Panduan Video
                </button>
              </div>

              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', marginBottom: '12px' }}>
                  💡 <strong>Belum punya link direct review?</strong><br />
                  Klik tombol di bawah untuk cari nama toko Anda di Productmate, lalu <strong>salin link</strong> yang muncul.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a 
                    href="https://productmate.com/google-review-link-generator" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '10px 12px', backgroundColor: '#ffffff', color: '#0f172a',
                      borderRadius: '10px', fontSize: '12px', fontWeight: '700', textDecoration: 'none',
                      boxSizing: 'border-box', border: '1px solid #cbd5e1'
                    }}
                  >
                    🔍 Productmate ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '10px 12px', backgroundColor: '#eff6ff', color: '#2563eb',
                      borderRadius: '10px', fontSize: '12px', fontWeight: '700',
                      boxSizing: 'border-box', border: '1px solid #bfdbfe', cursor: 'pointer'
                    }}
                  >
                    📹 Cara Ambil Link
                  </button>
                </div>
              </div>

              <input
                type="text"
                required
                placeholder="Paste link hasil dari Productmate di sini"
                value={reviewUrl}
                onChange={(e) => setReviewUrl(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', fontSize: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%', padding: '16px', backgroundColor: '#0f172a',
                color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '14px',
                cursor: 'pointer', marginTop: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              🚀 Simpan &amp; Aktifkan Papan
            </button>

            {device.is_active && (
              <button
                type="button"
                onClick={() => { setPinInput(''); setModalError(''); setShowResetModal(true); }}
                style={{
                  width: '100%', padding: '12px', backgroundColor: 'transparent',
                  color: '#ef4444', border: '1px solid #fecaca', borderRadius: '12px',
                  fontWeight: '600', fontSize: '13px', cursor: 'pointer'
                }}
              >
                🔄 Reset Papan (Hapus Data)
              </button>
            )}

            <div style={{ marginTop: '16px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0', fontWeight: '500' }}>
                Belum menerima PIN atau butuh bantuan?
              </p>
              <a
                href={waHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  width: '100%', padding: '12px 14px', backgroundColor: '#f8fafc', color: '#475569',
                  border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontWeight: '700',
                  textDecoration: 'none', boxSizing: 'border-box'
                }}
              >
                💬 Hubungi CS via WhatsApp ↗
              </a>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <Link href="/" style={{ padding: '12px 20px', backgroundColor: '#f8fafc', color: '#475569', textDecoration: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600', display: 'inline-block', border: '1px solid #e2e8f0' }}>
              ⬅️ Kembali ke Halaman Utama
            </Link>
          </div>
        )}

      </div>

      {/* MODAL POP-UP SUKSES AKTIVASI (BARU) */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            
            <div style={{ width: '64px', height: '64px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '16px', boxShadow: '0 10px 15px -3px rgba(22,163,74,0.2)' }}>
              🎉
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
              Aktivasi Berhasil!
            </h3>
            
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
              Papan Google Review untuk <strong>{storeName}</strong> siap digunakan! Pelanggan kini dapat langsung melakukan tap NFC atau scan QR.
            </p>

            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '12px', color: '#64748b' }}>
              ⏳ Mengalihkan ke Halaman Utama...
            </div>

            <button
              onClick={() => router.push('/')}
              style={{ width: '100%', padding: '14px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              Ke Halaman Utama
            </button>
          </div>
        </div>
      )}

      {/* MODAL PANDUAN VISUAL VIDEO MP4 */}
      {showGuideModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>📖 Cara Dapatkan Link Review</h3>
              <button onClick={() => setShowGuideModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <video 
                src="/tutorial-google-review.MP4" 
                autoPlay 
                loop 
                muted 
                playsInline 
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '16px' }}
              />
            </div>

            <ol style={{ margin: '0 0 20px 0', paddingLeft: '20px', fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
              <li style={{ marginBottom: '6px' }}>Buka aplikasi <strong>Google Maps</strong> di HP Anda.</li>
              <li style={{ marginBottom: '6px' }}>Cari dan pilih nama <strong>Toko / Usaha</strong> Anda.</li>
              <li style={{ marginBottom: '6px' }}>Geser ke tab <strong>Ulasan (Reviews)</strong>.</li>
              <li style={{ marginBottom: '6px' }}>Klik tombol <strong>Bagikan Form Ulasan</strong>.</li>
              <li>Pilih <strong>Salin Link</strong> lalu tempelkan di kolom input ini.</li>
            </ol>

            <button
              onClick={() => setShowGuideModal(false)}
              style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI PIN AKTIVASI */}
      {showPinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '340px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', textAlign: 'center' }}>
            
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
              Otorisasi Akses
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Masukkan <strong>6-Digit PIN</strong> yang kami kirimkan untuk verifikasi kepemilikan.
            </p>

            <form onSubmit={handleFinalSubmit} autoComplete="off">
              <div style={{ marginBottom: '16px' }}>
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
                    width: '100%', padding: '16px', fontSize: '22px', textAlign: 'center',
                    letterSpacing: '10px', borderRadius: '14px', border: '1px solid #cbd5e1',
                    boxSizing: 'border-box', backgroundColor: '#f8fafc', outline: 'none'
                  }}
                />
              </div>

              {modalError && (
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
                  {modalError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowPinModal(false); setPinInput(''); setModalError(''); }} style={{ flex: 1, padding: '14px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '14px', backgroundColor: submitting ? '#94a3b8' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Memproses' : 'Otorisasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI RESET KARTU */}
      {showResetModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '340px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', textAlign: 'center' }}>
            
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#ef4444', letterSpacing: '-0.5px' }}>
              Reset Perangkat?
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Data toko akan dihapus dan perangkat kembali ke kondisi awal. Masukkan PIN Anda:
            </p>

            <form onSubmit={handleResetSubmit} autoComplete="off">
              <div style={{ marginBottom: '16px' }}>
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
                    width: '100%', padding: '16px', fontSize: '22px', textAlign: 'center',
                    letterSpacing: '10px', borderRadius: '14px', border: '1px solid #fecaca',
                    boxSizing: 'border-box', backgroundColor: '#fef2f2', outline: 'none'
                  }}
                />
              </div>

              {modalError && (
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
                  {modalError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowResetModal(false); setPinInput(''); setModalError(''); }} style={{ flex: 1, padding: '14px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '14px', backgroundColor: submitting ? '#94a3b8' : '#ef4444', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Memproses' : 'Ya, Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
