'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function RedirectPage({ params }) {
  // Unwrapping params Promise (Aman untuk Next.js App Router terbaru)
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const id = resolvedParams?.id;

  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('Menghubungkan ke Google Review...');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!id) return;

    const executeRedirect = async () => {
      try {
        // 1. Ambil data kartu dari database Supabase
        const { data: device, error } = await supabase
          .from('devices')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.error('Database error:', error);
          setIsError(true);
          setStatusMessage('Terjadi kesalahan koneksi database.');
          return;
        }

        // 2. Jika kartu TIDAK DITEMUKAN, BELUM AKTIF, atau LINK KOSONG -> Lempar ke Setup
        if (!device || !device.is_active || !device.target_url || device.target_url.trim() === '') {
          setStatusMessage('Kartu belum diaktifkan. Mengalihkan ke halaman setup...');
          setTimeout(() => {
            router.replace(`/setup/${id}`);
          }, 800);
          return;
        }

        // 3. Pastikan URL diawali dengan https:// atau http://
        let destinationUrl = device.target_url.trim();
        if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
          destinationUrl = `https://${destinationUrl}`;
        }

        // 4. Catat Log Statistik Scan/Tap ke tabel 'device_stats' (Sesuai dengan Stats Page)
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const srcType = urlParams.get('src') === 'qr' ? 'qr' : 'nfc';

          await supabase.from('device_stats').insert([
            {
              device_id: id,
              type: srcType
            }
          ]);
        } catch (logErr) {
          console.error('Gagal mencatat statistik:', logErr);
          // Abaikan error log agar redirect utama tetap berjalan mulus
        }

        // 5. Eksekusi Pengalihan Langsung (Direct Redirect)
        setStatusMessage('Mengalihkan ke Google Review...');
        window.location.replace(destinationUrl);

      } catch (err) {
        console.error('Redirect Exception:', err);
        setIsError(true);
        setStatusMessage('Gagal mengalihkan. Membuka halaman aktivasi...');
        setTimeout(() => {
          router.replace(`/setup/${id}`);
        }, 1200);
      }
    };

    executeRedirect();
  }, [id, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '32px 24px',
        borderRadius: '20px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
        maxWidth: '360px',
        width: '100%'
      }}>
        {/* ANIMASI SPINNER LOGO GOOGLE */}
        <div style={{
          width: '56px',
          height: '56px',
          margin: '0 auto 20px auto',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
            alt="Google Logo"
            style={{
              position: 'absolute',
              width: '24px',
              height: '24px'
            }}
          />
        </div>

        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '16px',
          fontWeight: '700',
          color: isError ? '#dc2626' : '#0f172a'
        }}>
          {isError ? 'Gagal Mengalihkan' : 'Menghubungkan Papan Review'}
        </h3>

        <p style={{
          margin: 0,
          fontSize: '13px',
          color: '#64748b',
          lineHeight: '1.5'
        }}>
          {statusMessage}
        </p>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
