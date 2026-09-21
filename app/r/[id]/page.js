import { createClient } from '@supabase/supabase-js';

// 1. WAJIB: Cegah Vercel melakukan cache agar setiap kali ditap, selalu terhitung interaksi baru
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function RedirectPage({ params, searchParams }) {
  // 2. Unwrapping Params (Sesuai standar Next.js App Router terbaru)
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  const resolvedSearch = await searchParams;
  // Deteksi Tap NFC atau Scan QR langsung dari URL
  const type = (resolvedSearch?.type === 'qr' || resolvedSearch?.src === 'qr') ? 'qr' : 'nfc';

  let destinationUrl = '';
  let isError = false;
  let statusMessage = 'Menghubungkan ke Google Review...';

  if (!id) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
        <meta httpEquiv="refresh" content="0;url=/" />
        Mengalihkan...
      </div>
    );
  }

  // 3. Ambil data dari Supabase (DI EKSEKUSI OLEH SERVER VERCEL)
  const { data: device, error } = await supabase
    .from('devices')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    isError = true;
    statusMessage = 'Terjadi kesalahan koneksi database.';
    destinationUrl = `/setup/${id}`;
  } else if (!device || !device.is_active || !device.target_url || device.target_url.trim() === '') {
    statusMessage = 'Kartu belum diaktifkan. Mengalihkan ke halaman setup...';
    destinationUrl = `/setup/${id}`;
  } else {
    destinationUrl = device.target_url.trim();
    if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
      destinationUrl = `https://${destinationUrl}`;
    }

    // 4. MENCATAT STATISTIK LANGSUNG DARI SERVER (100% ANTI GAGAL)
    // Karena ini dieksekusi oleh Server Vercel, browser HP pelanggan TIDAK BISA membatalkannya!
    const { error: statErr } = await supabase.from('device_stats').insert([
      {
        device_id: id,
        type: type,
        created_at: new Date().toISOString()
      }
    ]);
    
    if (statErr) {
      console.error('Server Insert Error:', statErr.message);
    }
  }

  // 5. Render Antarmuka Visual (Sama persis seperti UI asli Anda)
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
      {/* Fallback Redirect jika JavaScript di HP pembeli mati lambat */}
      <meta httpEquiv="refresh" content={`1;url=${destinationUrl}`} />

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

        {/* Karena ini bukan 'use client', kita gunakan tag style standar */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>

      {/* Script Pengalihan Langsung yang Mulus */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            setTimeout(function() {
              window.location.replace("${destinationUrl}");
            }, 800);
          `
        }}
      />
    </div>
  );
}
