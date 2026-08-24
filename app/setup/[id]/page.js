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

  const handleActivate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

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
          target_url: targetUrl,
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
      maxWidth: '420px',
      margin: '40px auto',
      padding: '24px',
      fontFamily: 'sans-serif',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      borderRadius: '12px',
      backgroundColor: '#ffffff'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Aktivasi Papan NFC</h2>
      <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '24px' }}>
        ID Perangkat: <strong>{id}</strong>
      </p>

      {isSuccess ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <h3 style={{ color: '#2e7d32' }}>🎉 Aktivasi Berhasil!</h3>
          <p style={{ color: '#444', fontSize: '14px', lineHeight: '1.5' }}>
            Papan akrilik NFC & QR Code Anda sudah aktif dan terhubung ke halaman Google Review toko Anda.
          </p>
          <a
            href={targetUrl}
            style={{
              display: 'inline-block',
              marginTop: '16px',
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Uji Coba Buka Link Google Review
          </a>
        </div>
      ) : (
        <form onSubmit={handleActivate}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 'bold' }}>
              PIN Aktivasi (dari Kertas Panduan):
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 882190"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 'bold' }}>
              Link Google Review Toko Anda:
            </label>
            <input
              type="url"
              required
              placeholder="https://g.page/r/xxxxx/review atau link Google Maps"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#ccc' : '#2e7d32',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Memproses...' : 'Aktifkan Papan Akrilik'}
          </button>

          {message && (
            <p style={{ marginTop: '16px', color: '#d32f2f', textAlign: 'center', fontSize: '14px' }}>
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
