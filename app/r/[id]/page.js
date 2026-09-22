import { createClient } from '@supabase/supabase-js';

// Memaksa Vercel agar TIDAK mem-cache halaman pengalihan ini
export const dynamic = 'force-dynamic';

export default async function RedirectPage({ params, searchParams }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const resolvedParams = await params;
  const rawId = resolvedParams?.id || '';
  const cleanId = rawId.split('?')[0].trim();

  const resolvedSearch = await searchParams;
  const rawSrc = String(resolvedSearch?.src || resolvedSearch?.type || '').toLowerCase();
  const scanType = rawSrc === 'qr' ? 'qr' : 'nfc';

  let destinationUrl = '';
  let statusMessage = 'Menghubungkan ke Google Review...';
  let dbErrorDetail = null;

  if (!cleanId) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>ID Perangkat Tidak Valid</div>;
  }

  try {
    // 1. Ambil data perangkat
    const { data: device, error: fetchErr } = await supabase
      .from('devices')
      .select('id, target_url, is_active, nfc_scans, qr_scans')
      .eq('id', cleanId)
      .maybeSingle();

    if (fetchErr) {
      statusMessage = 'Gagal mengambil data perangkat.';
      dbErrorDetail = 'Fetch Error: ' + fetchErr.message;
    } else if (!device || !device.is_active || !device.target_url || device.target_url.trim() === '') {
      statusMessage = 'Kartu belum diaktifkan.';
      destinationUrl = `/setup/${cleanId}`;
    } else {
      destinationUrl = device.target_url.trim();
      if (!destinationUrl.startsWith('http')) {
        destinationUrl = `https://${destinationUrl}`;
      }

      // 2. COBA INSERT STATISTIK
      const { error: insertErr } = await supabase
        .from('device_stats')
        .insert([{ device_id: cleanId, type: scanType }]);

      if (insertErr) {
        statusMessage = 'Gagal menyimpan ke device_stats.';
        dbErrorDetail = 'Supabase Insert Error: ' + insertErr.message;
      } else {
        // 3. UPDATE COUNTER DEVICE
        if (scanType === 'nfc') {
          const nextNfc = (Number(device.nfc_scans) || 0) + 1;
          await supabase.from('devices').update({ nfc_scans: nextNfc }).eq('id', cleanId);
        } else {
          const nextQr = (Number(device.qr_scans) || 0) + 1;
          await supabase.from('devices').update({ qr_scans: nextQr }).eq('id', cleanId);
        }
      }
    }
  } catch (err) {
    statusMessage = 'Server Exception';
    dbErrorDetail = err.message;
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', 
      fontFamily: 'sans-serif', padding: '20px', textAlign: 'center'
    }}>
      
      {/* JIKA TIDAK ADA ERROR, REDIRECT BERJALAN NORMAL */}
      {!dbErrorDetail && destinationUrl && (
        <meta httpEquiv="refresh" content={`1;url=${destinationUrl}`} />
      )}

      <div style={{
        backgroundColor: '#ffffff', padding: '32px 24px', borderRadius: '20px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0',
        maxWidth: '360px', width: '100%'
      }}>
        {dbErrorDetail ? (
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>❌</div>
        ) : (
          <div style={{
            width: '40px', height: '40px', margin: '0 auto 16px auto',
            border: '3px solid #e2e8f0', borderTop: '3px solid #2563eb',
            borderRadius: '50%', animation: 'spin 1s linear infinite'
          }} />
        )}

        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: dbErrorDetail ? '#dc2626' : '#0f172a' }}>
          {dbErrorDetail ? 'Pencatatan Gagal' : 'Menghubungkan Papan Review'}
        </h3>

        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          {statusMessage}
        </p>

        {/* JIKA ADA ERROR, KOTAK MERAH INI AKAN MUNCUL */}
        {dbErrorDetail && (
          <div style={{
            marginTop: '16px', padding: '10px', backgroundColor: '#fef2f2',
            border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626',
            fontSize: '11px', textAlign: 'left', wordBreak: 'break-all'
          }}>
            <strong>Detail Error:</strong> {dbErrorDetail}
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
      </div>

      {!dbErrorDetail && destinationUrl && (
        <script dangerouslySetInnerHTML={{ __html: `setTimeout(function() { window.location.replace("${destinationUrl}"); }, 800);` }} />
      )}
    </div>
  );
}
