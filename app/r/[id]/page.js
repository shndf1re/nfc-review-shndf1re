import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function RedirectPage({ params, searchParams }) {
  // Pastikan variabel environment terbaca di server Vercel
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
  let dbErrorDetail = null; // Menangkap error spesifik Supabase

  if (!cleanId) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>ID Tidak Valid</div>;
  }

  try {
    const { data: device, error: fetchErr } = await supabase
      .from('devices')
      .select('id, target_url, is_active, nfc_scans, qr_scans')
      .eq('id', cleanId)
      .maybeSingle();

    if (fetchErr) {
      statusMessage = 'Terjadi kesalahan koneksi database.';
      dbErrorDetail = 'Fetch Error: ' + fetchErr.message;
    } else if (!device || !device.is_active || !device.target_url || device.target_url.trim() === '') {
      statusMessage = 'Kartu belum diaktifkan atau tidak ditemukan.';
      destinationUrl = `/setup/${cleanId}`;
    } else {
      destinationUrl = device.target_url.trim();
      if (!destinationUrl.startsWith('http')) {
        destinationUrl = `https://${destinationUrl}`;
      }

      // 1. TANGKAP ERROR INSERT STATISTIK
      const { error: insertErr } = await supabase
        .from('device_stats')
        .insert([{ device_id: cleanId, type: scanType }]);

      if (insertErr) {
        statusMessage = 'Gagal menyimpan statistik ke database.';
        dbErrorDetail = 'Supabase Insert Error: ' + insertErr.message + ' | Details: ' + insertErr.details;
      } else {
        // 2. UPDATE COUNTER SCANS HANYA JIKA INSERT STATISTIK BERHASIL
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
    statusMessage = 'Terjadi kesalahan sistem (Server Exception).';
    dbErrorDetail = err.message;
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      padding: '20px', textAlign: 'center'
    }}>
      
      {/* HANYA LAKUKAN REDIRECT JIKA TIDAK ADA ERROR DATABASE */}
      {!dbErrorDetail && destinationUrl && (
        <meta httpEquiv="refresh" content={`1;url=${destinationUrl}`} />
      )}

      <div style={{
        backgroundColor: '#ffffff', padding: '32px 24px', borderRadius: '20px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0',
        maxWidth: '360px', width: '100%'
      }}>
        
        {!dbErrorDetail && (
          <div style={{
            width: '56px', height: '56px', margin: '0 auto 20px auto', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              width: '100%', height: '100%', border: '4px solid #e2e8f0',
              borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite'
            }} />
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" style={{ position: 'absolute', width: '24px', height: '24px' }} />
          </div>
        )}

        {dbErrorDetail && (
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🚨</div>
        )}

        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: dbErrorDetail ? '#dc2626' : '#0f172a' }}>
          {dbErrorDetail ? 'Proses Terhenti' : 'Menghubungkan Papan Review'}
        </h3>

        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
          {statusMessage}
        </p>

        {/* TAMPILAN ERROR KHUSUS UNTUK ANDA BACA */}
        {dbErrorDetail && (
          <div style={{
            marginTop: '20px', padding: '12px', backgroundColor: '#fef2f2',
            border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c',
            fontSize: '12px', textAlign: 'left', wordBreak: 'break-all', fontFamily: 'monospace'
          }}>
            <strong>Error Detail:</strong><br/>
            {dbErrorDetail}
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
