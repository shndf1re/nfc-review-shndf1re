import { createClient } from '@supabase/supabase-js';

// Memaksa Vercel agar TIDAK melakukan caching pada halaman ini
// Setiap kali NFC ditap atau QR discan, server akan selalu memproses ulang & mencatat statistik baru!
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function RedirectPage({ params, searchParams }) {
  // Unwrapping params & searchParams (Sesuai standar Next.js App Router terbaru)
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  const resolvedSearch = await searchParams;
  const type = (resolvedSearch?.type === 'qr' || resolvedSearch?.src === 'qr') ? 'qr' : 'nfc';

  let destinationUrl = '';
  let isError = false;
  let statusMessage = 'Menghubungkan ke Google Review...';
  let debugError = '';

  if (!id) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
        <meta httpEquiv="refresh" content="0;url=/" />
        Mengalihkan...
      </div>
    );
  }

  try {
    // 1. Ambil data perangkat dari Supabase
    const { data: device, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      isError = true;
      statusMessage = 'Terjadi kesalahan koneksi database.';
      debugError = 'Fetch Device Error: ' + error.message;
      destinationUrl = `/setup/${id}`;
    } else if (!device || !device.is_active || !device.target_url || device.target_url.trim() === '') {
      statusMessage = 'Kartu belum diaktifkan. Mengalihkan ke halaman setup...';
      destinationUrl = `/setup/${id}`;
    } else {
      destinationUrl = device.target_url.trim();
      if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
        destinationUrl = `https://${destinationUrl}`;
      }

      // 2. CATAT STATISTIK LANGSUNG DARI SERVER VERCEL KE TABEL device_stats
      const { error: statErr } = await supabase.from('device_stats').insert([
        {
          device_id: id,
          type: type,
          created_at: new Date().toISOString()
        }
      ]);

      if (statErr) {
        console.error('Supabase Stat Insert Error:', statErr);
        debugError = 'Insert Stat Error: ' + statErr.message;
      }

      // 3. UPDATE JUGA COUNTER PADA TABEL devices (nfc_scans / qr_scans)
      if (type === 'nfc') {
        const currentNfc = Number(device.nfc_scans) || 0;
        await supabase.from('devices').update({ nfc_scans: currentNfc + 1 }).eq('id', id);
      } else {
        const currentQr = Number(device.qr_scans) || 0;
        await supabase.from('devices').update({ qr_scans: currentQr + 1 }).eq('id', id);
      }
    }
  } catch (err) {
    console.error('Redirect Exception:', err);
    isError = true;
    statusMessage = 'Gagal mengalihkan. Membuka halaman aktivasi...';
    debugError = 'Server Exception: ' + err.message;
    destinationUrl = `/setup/${id}`;
  }

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
      {/* Jika tidak ada error debug, lakukan redirect otomatis dalam 1 detik via Meta Refresh */}
      {!debugError && <meta httpEquiv="refresh" content={`1;url=${destinationUrl}`} />}

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

        {/* TAMPILKAN PESAN DEBUG MERAH JIKA SUPABASE MENOLAK / ERROR */}
        {debugError && (
          <div style={{
            marginTop: '16px',
            padding: '10px 12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '11px',
            textAlign: 'left',
            wordBreak: 'break-all'
          }}>
            ⚠️ <strong>Debug Error:</strong> {debugError}
          </div>
        )}

        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>

      {/* Eksekusi pengalihan otomatis jika tidak ada error */}
      {!debugError && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              setTimeout(function() {
                window.location.replace("${destinationUrl}");
              }, 800);
            `
          }}
        />
      )}
    </div>
  );
}
