import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const requestUrl = new URL(request.url);

  // 1. Ambil ID murni dari pathname URL (misal: /r/NFC-sjP6d9LC -> NFC-sjP6d9LC)
  const pathSegments = requestUrl.pathname.split('/').filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] || '';
  const cleanId = lastSegment.split('?')[0].split('&')[0].trim();

  // 2. Ambil tipe scan (nfc / qr)
  const rawSrc = String(requestUrl.searchParams.get('src') || requestUrl.searchParams.get('type') || '').toLowerCase();
  const scanType = rawSrc === 'qr' ? 'qr' : 'nfc';

  if (!cleanId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Supabase Client dengan Service Role Key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wseqokwtcvwuhhykuxhy.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  let destinationUrl = `/setup/${cleanId}`;

  try {
    // 3. Query Supabase dengan cleanId yang dijamin murni
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

      // 4. Catat Log ke device_stats
      const { error: insertErr } = await supabase
        .from('device_stats')
        .insert([{ device_id: cleanId, type: scanType }]);

      if (insertErr) {
        console.error('Insert Error:', insertErr.message);
      }

      // 5. Update Total Counter di devices
      const currentCount = scanType === 'nfc' ? Number(device.nfc_scans || 0) : Number(device.qr_scans || 0);
      const updateData = scanType === 'nfc' 
        ? { nfc_scans: currentCount + 1 } 
        : { qr_scans: currentCount + 1 };

      await supabase
        .from('devices')
        .update(updateData)
        .eq('id', cleanId);
    } else {
      console.error('Device tidak ditemukan atau tidak aktif untuk ID:', cleanId);
    }
  } catch (err) {
    console.error('Route Execution Exception:', err);
  }

  // 6. Return Response HTML 200 Client Redirect (Bypass Caching HP & Cloudflare)
  const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
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
