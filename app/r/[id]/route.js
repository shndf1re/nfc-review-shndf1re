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

      // 1. Insert ke device_stats
      await supabase
        .from('device_stats')
        .insert([{ device_id: cleanId, type: scanType }]);

      // 2. Update scan counter
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
    console.error('Execution Exception:', err);
  }

  // Gunakan HTML response 200 agar bypass cache Cloudflare & Browser
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
