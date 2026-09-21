import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(req, context) {
  try {
    const params = await context.params;
    const deviceId = params?.deviceId;

    if (!deviceId) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'nfc';

    // 1. Ambil URL tujuan dari tabel devices
    const { data: deviceData } = await supabase
      .from('devices')
      .select('target_url')
      .eq('id', deviceId)
      .maybeSingle();

    // 2. Tambah statistik ke device_stats
    await supabase.from('device_stats').insert([
      {
        device_id: deviceId,
        type: type,
        created_at: new Date().toISOString()
      }
    ]);

    // 3. Redirect ke Google Review
    if (deviceData?.target_url) {
      return NextResponse.redirect(deviceData.target_url);
    }

    return NextResponse.redirect(new URL('/', req.url));
  } catch (err) {
    console.error('Redirect Error:', err);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
