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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wseqokwtcvwuhhykuxhy.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  const supabase = createClient(supabaseUrl, supabaseKey);

  let destinationUrl = `/setup/${cleanId}`;

  if (!cleanId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const { data: device } = await supabase
      .from('devices')
      .select('id, target_url, is_active, nfc_scans, qr_scans')
      .eq('id', cleanId)
      .maybeSingle();

    if (device && device.is_active && device.target_url) {
      let target = device.target_url.trim();
      if (!target.startsWith('http')) {
        target = `https://${target}`;
      }
      destinationUrl = target;

      // CATAT KE DATABASE
      await supabase.from('device_stats').insert([{ device_id: cleanId, type: scanType }]);

      if (scanType === 'nfc') {
        await supabase.from('devices').update({ nfc_scans: (Number(device.nfc_scans) || 0) + 1 }).eq('id', cleanId);
      } else {
        await supabase.from('devices').update({ qr_scans: (Number(device.qr_scans) || 0) + 1 }).eq('id', cleanId);
      }
    }
  } catch (e) {
    console.error(e);
  }

  return NextResponse.redirect(destinationUrl, {
    status: 307,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    },
  });
}
