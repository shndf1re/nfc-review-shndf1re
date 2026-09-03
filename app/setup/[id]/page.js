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
  const [pinInput, setPinInput] = useState('');
  const [storeName, setStoreName] = useState('');
  const [reviewUrl, setReviewUrl] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!device) {
      setMessage({ type: 'error', text: 'Kartu tidak valid.' });
      return;
    }

    const inputPinClean = String(pinInput).trim();
    const devicePinClean = String(device.pin).trim();

    if (inputPinClean !== devicePinClean) {
      setMessage({ type: 'error', text: '❌ PIN Kartu Salah! Periksa kembali pesan WA dari kami.' });
      return;
    }

    const formattedUrl = formatReviewUrl(reviewUrl);
    if (!formattedUrl) {
      setMessage({ type: 'error', text: '❌ Link Google Review / Place ID wajib diisi!' });
      return;
    }

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
        setMessage({ type: 'error', text: '❌ Gagal memperbarui data: ' + error.message });
      } else {
        setMessage({ type: 'success', text: '🎉 Papan Akrilik Anda Berhasil Diaktifkan!' });
        setTimeout(() => {
          router.push(`/r/${id}`);
        }, 1800);
      }
    } catch (err) {
      setMessage({ type: 'error', text: '❌ Terjadi kesalahan saat menyimpan.' });
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

        {/* NOTIFIKASI MESSAGE */}
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
          <form onSubmit={handleSetupSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
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

              {/* BANNER / BANTUAN GENERATE LINK PRODUCTMATE */}
              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px', borderRadius: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: '#0369a1', lineHeight: '1.4', marginBottom: '8px' }}>
                  💡 <strong>Belum punya link direct review?</strong><br />
                  Klik tombol di bawah ini untuk mencari nama toko Anda di Productmate, lalu <strong>salin/copy link</strong> yang dihasilkan.
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

            {/* INPUT PIN AKSES KARTU */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                🔑 PIN Akses Kartu (6-Digit)
              </label>
              <input
                type="password"
                required
                maxLength={6}
                autoComplete="new-password"
                placeholder="Masukkan PIN dari WA"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '16px', textAlign: 'center', letterSpacing: '4px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#f8fafc', outline: 'none' }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block', textAlign: 'center' }}>
                PIN dapat dilihat dari pesan WhatsApp yang kami kirimkan.
              </span>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', padding: '14px', backgroundColor: submitting ? '#94a3b8' : '#2563eb',
                color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px',
                cursor: submitting ? 'not-allowed' : 'pointer', marginTop: '4px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}
            >
              {submitting ? 'Mengaktifkan Papan...' : '🚀 Simpan & Aktifkan Papan'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <Link href="/" style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#334155', textDecoration: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '600', display: 'inline-block' }}>
              ⬅️ Kembali ke Halaman Utama
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
