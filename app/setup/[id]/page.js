'use client';

import { useState, use } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SetupPage({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams?.id;

  const [pinInput, setPinInput] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Helper Format Review URL yang Aman & Bebas Eror
  const formatReviewUrl = (url) => {
    let cleanUrl = url.trim();

    // 1. Jika pengguna memasukkan Place ID murni (misal: ChIJrfzkjSV_9i0R_UFFaoAD1ic)
    if (cleanUrl.startsWith('ChIJ') && !cleanUrl.includes(' ')) {
      return `https://search.google.com/local/writereview?placeid=${cleanUrl}`;
    }

    // 2. Jika link sudah mengandung parameter placeid= yang valid
    const match = cleanUrl.match(/placeid=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://search.google.com/local/writereview?placeid=${match[1]}`;
    }

    // 3. Jika pengguna memasukkan link Google Maps biasa (g.page / maps.app.goo.gl / link share)
    return cleanUrl;
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formattedUrl = formatReviewUrl(targetUrl);

    try {
      const { data: device, error } = await supabase
        .from('devices')
        .select('*')
        .eq('id', id)
        .eq('pin', pinInput)
        .single();

      if (error || !device) {
        setMessage('❌ PIN yang Anda masukkan salah. Cek kembali kertas panduan.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('devices')
        .update({
          target_url: formattedUrl,
          is_active: true
        })
        .eq('id', id);

      if (updateError) {
        setMessage('❌ Gagal mengaktifkan. Silakan coba lagi.');
      } else {
        setIsSuccess(true);
      }
    } catch (err) {
      setMessage('❌ Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '32px 24px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            marginBottom: '12px'
          }}>✨</div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>Aktivasi Perangkat</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            ID Akrilik: <strong style={{ color: '#2563eb' }}>{id}</strong>
          </p>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#16a34a', fontSize: '18px' }}>Aktivasi Berhasil!</h3>
            <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Papan NFC & QR Code Anda sudah aktif dan terhubung ke halaman ulasan Google Review toko Anda.
            </p>
            <a
              href={targetUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              Uji Coba Tautan Google Review
            </a>
          </div>
        ) : (
          <form onSubmit={handleActivate}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                PIN Aktivasi (dari Panduan):
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan 6 digit PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  backgroundColor: '#f8fafc'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Link Google Review / Maps Toko:
              </label>
              <input
                type="text"
                required
                placeholder="Tempelkan link Google Maps / Place ID Toko"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  backgroundColor: '#f8fafc'
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                💡 <em>Bisa menggunakan Link Share dari Google Maps, Link Direct Review, atau Place ID (ChIJ...).</em>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: loading ? '#94a3b8' : '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
              }}
            >
              {loading ? 'Memproses...' : 'Aktifkan Papan Akrilik'}
            </button>

            {message && (
              <p style={{ marginTop: '16px', color: '#dc2626', textAlign: 'center', fontSize: '13px', fontWeight: '500' }}>
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
