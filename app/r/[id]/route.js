import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.id || '';
  const cleanId = rawId.split('?')[0].trim();

  const { searchParams } = new URL(request.url);
  const rawSrc = String(searchParams.get('src') || searchParams.get('type') || '').toLowerCase();
  const scanType = rawSrc === 'qr' ? 'qr' : 'nfc';

  if (!cleanId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Menggunakan SERVICE_ROLE_KEY untuk bypass RLS secara total dari server
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wseqokwtcvwuhhykuxhy.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  let destinationUrl = `/setup/${cleanId}`;

  try {
    // 1. Ambil target_url dari tabel devices
    const { data: device } = await supabase
      .from('devices')
      .select('id, target_url, is_active, nfc_scans, qr_scans')
      .eq('id', cleanId)
      .maybeSingle();

    if (device && device.is_active && device.target_url && device.target_url.trim() !== '') {
      let target = device.target_url.trim();
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = `https://${target}`;
      }
      destinationUrl = target;
    }

    // 2. MENCATAT STATISTIK (Dijalankan secara terisolasi tanpa await penahan)
    const recordStats = async () => {
      try {
        // Insert log statistik
        await supabase
          .from('device_stats')
          .insert([{ device_id: cleanId, type: scanType }]);

        // Update scan counter di tabel devices (jika perangkat ditemukan)
        if (device) {
          if (scanType === 'nfc') {
            const currentNfc = Number(device.nfc_scans) || 0;
            await supabase
              .from('devices')
              .update({ nfc_scans: currentNfc + 1 })
              .eq('id', cleanId);
          } else {
            const currentQr = Number(device.qr_scans) || 0;
            await supabase
              .from('devices')
              .update({ qr_scans: currentQr + 1 })
              .eq('id', cleanId);
          }
        }
      } catch (err) {
        console.error('Error recording stats:', err);
      }
    };

    // Jalankan pencatatan statistik
    await recordStats();

  } catch (err) {
    console.error('Route Execution Exception:', err);
  }

  // 3. Kembalikan Response HTML dengan status 200 agar TIDAK DI-CACHE oleh Cloudflare/Browser HP
  const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta http-equiv="refresh" content="0;url=${destinationUrl}">
    <title>Redirecting...</title>
  </head>
  <body>
    <script>
      window.location.replace("${destinationUrl}");
    </script>
  </body>
</html>`;

  return new NextResponse(htmlContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
