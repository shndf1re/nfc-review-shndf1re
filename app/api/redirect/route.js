import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const rawUrl = request.url;
  const urlObj = new URL(rawUrl);

  // 1. Ekstrak nilai 'id' mentah dari searchParams
  let rawIdParam = urlObj.searchParams.get('id') || '';

  // 2. Ambil ID murni (mengambil teks sebelum '?' atau '&')
  const cleanId = rawIdParam.split('?')[0].split('&')[0].trim();

  // 3. LOGIKA DETEKSI AKURAT: Cari parameter 'src' di seluruh URL mentah
  let scanType = 'nfc';

  // Decode URL untuk menangani karakter ter-encode seperti %3F atau %26
  const decodedUrl = decodeURIComponent(rawUrl).toLowerCase();

  if (
    decodedUrl.includes('src=qr') ||
    decodedUrl.includes('type=qr') ||
    urlObj.searchParams.get('src') === 'qr' ||
    urlObj.searchParams.get('type') === 'qr'
  ) {
    scanType = 'qr';
  }

  if (!cleanId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Koneksi Supabase Service Role Key
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

      // Mandatory Await: Insert log statistik acuan tipe scan (qr / nfc)
      await supabase
        .from('device_stats')
        .insert([{ device_id: cleanId, type: scanType }]);

      // Mandatory Await: Update total counter di tabel devices
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
    console.error('API Redirect Error:', err);
  }

  // Response HTTP 200 Client Redirect
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
