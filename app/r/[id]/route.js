import { NextResponse } from 'next/server';

// 1. PAKSA MENGGUNAKAN VERCEL EDGE RUNTIME (Sangat cepat & tanpa cold-start)
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  const requestUrl = new URL(request.url);

  // Ambil ID murni dari path URL (/r/NFC-sjP6d9LC -> NFC-sjP6d9LC)
  const pathSegments = requestUrl.pathname.split('/').filter(Boolean);
  const cleanId = (pathSegments[pathSegments.length - 1] || '').split('?')[0].trim();

  const rawSrc = String(requestUrl.searchParams.get('src') || requestUrl.searchParams.get('type') || '').toLowerCase();
  const scanType = rawSrc === 'qr' ? 'qr' : 'nfc';

  if (!cleanId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wseqokwtcvwuhhykuxhy.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  let destinationUrl = `/setup/${cleanId}`;

  try {
    // 2. FETCH DEVICE DATA DENGAN REST API LANGSUNG
    const deviceRes = await fetch(
      `${supabaseUrl}/rest/v1/devices?id=eq.${cleanId}&select=id,target_url,is_active,nfc_scans,qr_scans`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      }
    );

    const devices = await deviceRes.json();
    const device = devices && devices.length > 0 ? devices[0] : null;

    if (device && device.is_active && device.target_url) {
      let target = device.target_url.trim();
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = `https://${target}`;
      }
      destinationUrl = target;

      // 3. PROSES INSERT KE device_stats PADA BACKGROUND DENGAN waitUntil
      const insertPromise = fetch(`${supabaseUrl}/rest/v1/device_stats`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ device_id: cleanId, type: scanType }),
      });

      // 4. UPDATE SCAN COUNTER PADA TABEL devices
      const currentCount = scanType === 'nfc' ? Number(device.nfc_scans || 0) : Number(device.qr_scans || 0);
      const updateData = scanType === 'nfc' 
        ? { nfc_scans: currentCount + 1 } 
        : { qr_scans: currentCount + 1 };

      const updatePromise = fetch(`${supabaseUrl}/rest/v1/devices?id=eq.${cleanId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(updateData),
      });

      // Tunggu hingga kedua request HTTP Supabase selesai
      await Promise.all([insertPromise, updatePromise]);
    }
  } catch (err) {
    console.error('Edge Route Exception:', err);
  }

  // 5. HTTP REDIRECT MURNI (STATUS 307) DENGAN HEADERS ANTI-CACHE UNTUK EDGE RUNTIME
  return NextResponse.redirect(destinationUrl, {
    status: 307,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
