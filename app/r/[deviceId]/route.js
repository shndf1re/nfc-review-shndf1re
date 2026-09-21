import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(req, { params }) {
  try {
    const { deviceId } = params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'nfc'; // Default 'nfc' atau 'qr'

    if (!deviceId) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // 1. Cari target URL Google Maps dari tabel 'devices'
    const { data: deviceData } = await supabase
      .from('devices')
      .select('target_url, is_active')
      .eq('id', deviceId)
      .maybeSingle();

    // 2. Catat Interaksi ke tabel 'device_stats' secara otomatis
    await supabase.from('device_stats').insert([
      {
        device_id: deviceId,
        type: type, // 'nfc' atau 'qr'
        created_at: new Date().toISOString()
      }
    ]);

    // 3. Redirect ke Google Maps Toko (atau ke halaman utama jika target_url belum diset)
    if (deviceData && deviceData.target_url) {
      return NextResponse.redirect(deviceData.target_url);
    } else {
      return NextResponse.redirect(new URL('/', req.url));
    }

  } catch (err) {
    console.error('Redirect Error:', err);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
