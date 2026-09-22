import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, context) {
  // 1. Ambil params ID
  const params = await context.params;
  const rawId = params?.id || '';
  const cleanId = rawId.split('?')[0].trim();

  // 2. Ambil parameter src
  const { searchParams } = new URL(request.url);
  const rawSrc = String(searchParams.get('src') || searchParams.get('type') || '').toLowerCase();
  const scanType = rawSrc === 'qr' ? 'qr' : 'nfc';

  if (!cleanId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wseqokwtcvwuhhykuxhy.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  let destinationUrl = `/setup/${cleanId}`;

  try {
    const { data: device } = await supabase
      .from('devices')
      .select('id, target_url, is_active, nfc_scans, qr_scans')
      .eq('id', cleanId)
      .maybeSingle();

    if (device && device.is_active && device.target_url) {
      let target = device.target_url.trim();
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = `https://${target}`;
      }
      destinationUrl = target;

      // Mandatory Await untuk mematikan potensi aborted request di background
      await supabase
        .from('device_stats')
        .insert([{ device_id: cleanId, type: scanType }]);

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

  // Tambahkan timestamp unik di URL redirect agar browser HP menganggapnya request baru
  const finalDestination = destinationUrl.includes('?') 
    ? `${destinationUrl}&_t=${Date.now()}` 
    : `${destinationUrl}?_t=${Date.now()}`;

  // Mengembalikan HTML 200 + Anti-Cache Headers yang Sangat Agresif
  const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate, max-age=0">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Mengarahkan...</title>
  </head>
  <body style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; background-color:#f9fafb;">
    <p style="color:#4b5563;">Menghubungkan ke Google Review...</p>
    <script>
      setTimeout(function() {
        window.location.replace("${finalDestination}");
      }, 100);
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
