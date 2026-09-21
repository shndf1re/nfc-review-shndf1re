import { createClient } from '@supabase/supabase-js';

// Memaksa Vercel agar TIDAK melakukan caching pada halaman pengalihan ini
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function RedirectPage({ params, searchParams }) {
  // 1. Unwrapping Params & SearchParams (Next.js 15 / App Router)
  const resolvedParams = await params;
  const rawId = resolvedParams?.id || '';

  // Bersihkan ID dari query string jika ada
  const cleanId = rawId.split('?')[0].trim();

  const resolvedSearch = await searchParams;
  const type = (resolvedSearch?.type === 'qr' || resolvedSearch?.src === 'qr') ? 'qr' : 'nfc';

  let destinationUrl = '';
  let isError = false;
  let statusMessage = 'Menghubungkan ke Google Review...';
  let debugError = '';

  if (!cleanId) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
        <meta httpEquiv="refresh" content="0;url=/" />
        Mengalihkan...
      </div>
    );
  }

  try {
    // 2. Cari perangkat berdasarkan cleanId
    const { data: device, error: fetchErr } = await supabase
      .from('devices')
      .select('id, target_url, is_active, nfc_scans, qr_scans')
      .eq('id', cleanId)
      .maybeSingle();

    if (fetchErr) {
      isError = true;
      statusMessage = 'Terjadi kesalahan koneksi database.';
      debugError = 'Fetch Error: ' + fetchErr.message;
      destinationUrl = `/setup/${cleanId}`;
    } else if (!device || !device.is_active || !device.target_url || device.target_url.trim() === '') {
      statusMessage = 'Kartu belum diaktifkan. Mengalihkan ke halaman setup...';
      destinationUrl = `/setup/${cleanId}`;
    } else {
      // Format URL Tujuan
      destinationUrl = device.target_url.trim();
      if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
        destinationUrl = `https://${destinationUrl}`;
      }

      // 3. PENCATATAN STATISTIK KE TABEL device_stats
      // Biarkan created_at diisi otomatis oleh PostgreSQL Supabase
      const { error: insertErr } = await supabase
        .from('device_stats')
        .insert([{ device_id: cleanId, type: type }]);

      if (insertErr) {
        console.error('Gagal insert device_stats:', insertErr.message);
        debugError = 'Insert Error: ' + insertErr.message;
      }

      // 4. UPDATE JUGA COUNTER DITABEL devices
      if (type === 'nfc') {
        const nextNfc = (Number(device.nfc_scans) || 0) + 1;
        await supabase.from('devices').update({ nfc_scans: nextNfc }).eq('id', cleanId);
      } else {
        const nextQr = (Number(device.qr_scans) || 0) + 1;
        await supabase.from('devices').update({ qr_scans: nextQr }).eq('id', cleanId);
      }
    }
  } catch (err) {
    console.error('Redirect Exception:', err);
    isError = true;
    statusMessage = 'Gagal mengalihkan. Membuka halaman aktivasi...';
    debugError = 'Server Exception: ' + err.message;
    destinationUrl = `/setup/${cleanId}`;
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
      {/* Jika tidak ada error debug, jalankan pengalihan otomatis */}
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
            style={{ position: 'absolute', width: '24px', height: '24px' }}
          />
        </div>

        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: isError ? '#dc2626' : '#0f172a' }}>
          {isError ? 'Gagal Mengalihkan' : 'Menghubungkan Papan Review'}
        </h3>

        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
          {statusMessage}
        </p>

        {/* PESAN DEBUG JIKA TERJADI KESALAHAN SUPABASE */}
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
            ⚠️ <strong>Debug Info:</strong> {debugError}
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
