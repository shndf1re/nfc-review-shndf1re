import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = (searchParams.get('id') || '').trim();
  const rawSrc = String(searchParams.get('src') || searchParams.get('type') || '').toLowerCase();
  const scanType = rawSrc === 'qr' ? 'qr' : 'nfc';

  if (!id) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wseqokwtcvwuhhykuxhy.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Supabase Anon Key Kamu
  const supabase = createClient(supabaseUrl, supabaseKey);

  let destinationUrl = `/setup/${id}`;

  try {
    const { data: device, error: fetchErr } = await supabase
      .from('devices')
      .select('id, target_url, is_active, nfc_scans, qr_scans')
      .eq('id', id)
      .maybeSingle();

    if (!fetchErr && device && device.is_active && device.target_url) {
      let target = device.target_url.trim();
      if (!target.startsWith('http')) {
        target = `https://${target}`;
      }
      destinationUrl = target;

      // 1. MENCATAT STATISTIK LANGSUNG
      const { error: insertErr } = await supabase
        .from('device_stats')
        .insert([{ device_id: id, type: scanType }]);

      if (insertErr) {
        console.error('Insert Stat Error:', insertErr.message);
      }

      // 2. UPDATE COUNTER DEVICE
      if (scanType === 'nfc') {
        const nextNfc = (Number(device.nfc_scans) || 0) + 1;
        await supabase.from('devices').update({ nfc_scans: nextNfc }).eq('id', id);
      } else {
        const nextQr = (Number(device.qr_scans) || 0) + 1;
        await supabase.from('devices').update({ qr_scans: nextQr }).eq('id', id);
      }
    }
  } catch (err) {
    console.error('API Redirect Exception:', err);
  }

  // Header anti-cache ketat
  return NextResponse.redirect(destinationUrl, {
    status: 307,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
