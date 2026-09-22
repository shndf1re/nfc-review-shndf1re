import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const requestUrl = new URL(request.url);

  // 1. Ambil ID murni dari URL path
  const pathSegments = requestUrl.pathname.split('/').filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] || '';
  const cleanId = lastSegment.split('?')[0].split('&')[0].trim();

  // 2. Ambil tipe scan
  const rawSrc = String(requestUrl.searchParams.get('src') || requestUrl.searchParams.get('type') || '').toLowerCase();
  const scanType = rawSrc === 'qr' ? 'qr' : 'nfc';

  if (!cleanId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Koneksi Supabase dengan Service Role Key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wseqokwtcvwuhhykuxhy.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  let destinationUrl = `/setup/${cleanId}`;

  try {
    const { data: device, error: fetchErr } = await supabase
      .from('devices')
      .select('id, target_url, is_active, nfc_scans, qr_scans')
      .eq('id', cleanId)
      .maybeSingle();

    if (!fetchErr && device && device.is_active && device.target_url) {
      let target = device.target_url.trim();
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = `https://${target}`;
      }
      destinationUrl = target;

      // 3. Catat statistik secara sinkron (AWAIT)
      await supabase
        .from('device_stats')
        .insert([{ device_id: cleanId, type: scanType }]);

      // 4. Update counter di devices (AWAIT)
      const currentCount = scanType === 'nfc' ? Number(device.nfc_scans || 0) : Number(device.qr_scans || 0);
      const updateData = scanType === 'nfc' 
        ? { nfc_scans: currentCount + 1 } 
        : { qr_scans: currentCount + 1 };

      await supabase
        .from('devices')
        .update(updateData)
        .eq('id', cleanId);
    }
  } catch (err) {
    console.error('Route Execution Error:', err);
  }

  // Tambahkan query parameter unik (Timestamp) pada URL tujuan agar browser HP wajib memuat ulang
  const finalDestination = destinationUrl.includes('?')
    ? `${destinationUrl}&_cb=${Date.now()}`
    : `${destinationUrl}?_cb=${Date.now()}`;

  // 5. Kembalikan HTML dengan Header Anti-Cache Paling Ketat (Status 200)
  const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Redirecting...</title>
  </head>
  <body style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; background:#f9fafb;">
    <p style="color:#6b7280; font-size:14px;">Menghubungkan ke Google Review...</p>
    <script>
      setTimeout(function() {
        window.location.replace("${finalDestination}");
      }, 150);
    </script>
  </body>
</html>`;

  return new NextResponse(htmlContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    },
  });
}
