import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Memaksa Vercel agar TIDAK PERNAH mem-cache endpoint ini!
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Ambil ID dari URL Params
  const resolvedParams = await params;
  const rawId = resolvedParams?.id || '';
  const cleanId = rawId.split('?')[0].trim();

  // 2. Ambil query parameter ?src=nfc atau ?src=qr
  const { searchParams } = new URL(request.url);
  const rawSrc = String(searchParams.get('src') || searchParams.get('type') || '').toLowerCase();
  const scanType = rawSrc === 'qr' ? 'qr' : 'nfc';

  let destinationUrl = `/setup/${cleanId}`;

  if (!cleanId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // 3. Ambil data kartu dari Supabase
    const { data: device, error: fetchErr } = await supabase
      .from('devices')
      .select('id, target_url, is_active, nfc_scans, qr_scans')
      .eq('id', cleanId)
      .maybeSingle();

    if (!fetchErr && device && device.is_active && device.target_url && device.target_url.trim() !== '') {
      let target = device.target_url.trim();
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = `https://${target}`;
      }
      destinationUrl = target;

      // 4. MENCATAT STATISTIK LANGSUNG DARI SERVER VERCEL
      const { error: insertErr } = await supabase
        .from('device_stats')
        .insert([
          {
            device_id: cleanId,
            type: scanType
          }
        ]);

      if (insertErr) {
        console.error('Insert Stat Error:', insertErr.message);
      }

      // 5. UPDATE SCAN COUNTER PADA TABEL DEVICES
      if (scanType === 'nfc') {
        const nextNfc = (Number(device.nfc_scans) || 0) + 1;
        await supabase.from('devices').update({ nfc_scans: nextNfc }).eq('id', cleanId);
      } else {
        const nextQr = (Number(device.qr_scans) || 0) + 1;
        await supabase.from('devices').update({ qr_scans: nextQr }).eq('id', cleanId);
      }
    }
  } catch (err) {
    console.error('Route Exception:', err);
  }

  // 6. Lakukan HTTP 307 Temporary Redirect murni dari Server
  // Menggunakan 'No-Cache' Header agar browser HP & Vercel CDN wajib mengeksekusi ulang tiap kali ditap
  return NextResponse.redirect(destinationUrl, {
    status: 307,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
