import { createClient } from '@supabase/supabase-js';

// Mencegah Vercel mem-cache halaman pengalihan ini
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function RedirectPage({ params, searchParams }) {
  // 1. Unwrapping params (Mendapatkan ID murni tanpa query string)
  const resolvedParams = await params;
  const rawId = resolvedParams?.id || '';
  
  // Bersihkan ID jika ada karakter aneh/query string yang terselip
  const cleanId = rawId.split('?')[0].trim();

  // 2. Unwrapping searchParams (Membaca ?src=qr atau ?src=nfc)
  const resolvedSearch = await searchParams;
  const rawSrc = (resolvedSearch?.src || resolvedSearch?.type || '').toLowerCase();
  
  // Jika src bernilai 'qr' maka tipe qr, selain itu (nfc/kosong) dianggap 'nfc'
  const scanType = rawSrc === 'qr' ? 'qr' : 'nfc';

  let destinationUrl = '';
  let isError = false;
  let statusMessage = 'Menghubungkan ke Google Review...';

  if (!cleanId) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
        <meta httpEquiv="refresh" content="0;url=/" />
        Mengalihkan...
      </div>
    );
  }

  try {
    // 3. Cari perangkat di database berdasarkan ID Murni (misal: NFC-a9N6y37D)
    const { data: device, error: fetchErr } = await supabase
      .from('devices')
      .select('id, target_url, is_active, nfc_scans, qr_scans')
      .eq('id', cleanId)
      .maybeSingle();

    if (fetchErr || !device) {
      isError = true;
      statusMessage = 'Kartu belum diaktifkan atau tidak ditemukan.';
      destinationUrl = `/setup/${cleanId}`;
    } else if (!device.is_active || !device.target_url || device.target_url.trim() === '') {
      statusMessage = 'Kartu belum diaktifkan. Mengalihkan ke halaman setup...';
      destinationUrl = `/setup/${cleanId}`;
    } else {
      // Format URL Tujuan
      destinationUrl = device.target_url.trim();
      if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
        destinationUrl = `https://${destinationUrl}`;
      }

      // 4. MENCATAT STATISTIK LANGSUNG KE TABEL device_stats
      const { error: insertErr } = await supabase
        .from('device_stats')
        .insert([
          {
            device_id: cleanId,
            type: scanType
          }
        ]);

      if (insertErr) {
        console.error('Gagal insert device_stats:', insertErr.message);
      }

      // 5. UPDATE COUNTER SCANS DITABEL devices
      if (scanType === 'nfc') {
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
      {/* Fallback Redirect */}
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

        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>

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
