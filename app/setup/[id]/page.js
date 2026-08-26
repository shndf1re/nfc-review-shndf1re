'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SetupPage({ params }) {
  const { id } = params;
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

    // Verifikasi PIN Kartu (Tipe String)
    const inputPinClean = String(pinInput).trim();
    const devicePinClean = String(device.pin).trim();

    if (inputPinClean !== devicePinClean) {
      setMessage({ type: 'error', text: '❌ PIN Kartu Salah! Periksa kembali format WA Anda.' });
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
        }, 2000);
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
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔄</div>
          <p style={{ margin: 0, fontSize: '14px' }}>Memuat halaman aktivasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '20px 16px', boxSizing: 'border-box', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px 20px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '10px' }}>
            📲
          </div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Aktivasi Papan Review</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>ID Kartu: <strong>{id}</strong></p>
        </div>

        {message.text && (
          <div style={{
            padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', marginBottom: '16px', textAlign: 'center',
            backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
            color: message.type === 'error' ? '#dc2626' : '#15803d'
          }}>
            {message.text}
          </div>
        )}

        {device ? (
          <form onSubmit={handleSetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                Nama Toko / Usaha
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Kopi Kenangan Samarinda"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                Link Direct Google Review / Place ID
              </label>
              <input
                type="text"
                required
                placeholder="Paste link review atau Place ID (ChIJ...)"
                value={reviewUrl}
                onChange={(e) => setReviewUrl(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                PIN Akses Kartu (6-Digit)
              </label>
              <input
                type="password"
                required
                placeholder="Masukkan PIN dari WA"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '15px', textAlign: 'center', letterSpacing: '3px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', padding: '12px', backgroundColor: submitting ? '#94a3b8' : '#2563eb',
                color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px',
                cursor: submitting ? 'not-allowed' : 'pointer', marginTop: '6px'
              }}
            >
              {submitting ? 'Menyimpan...' : '🚀 Aktifkan Papan Sekarang'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <Link href="/" style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#334155', textDecoration: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', display: 'inline-block' }}>
              ⬅️ Kembali ke Halaman Utama
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
