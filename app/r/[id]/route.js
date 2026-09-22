import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'NFC-a9N6y37D';
  const scanType = searchParams.get('src') === 'qr' ? 'qr' : 'nfc';

  // 1. Cek pembacaan ENV di Server Vercel
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wseqokwtcvwuhhykuxhy.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseKey) {
    return NextResponse.json({ 
      success: false, 
      error: 'CRITICAL: Supabase Key tidak terbaca di Vercel Server!' 
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. Cek Eksekusi Insert
  const { data: insertData, error: insertErr } = await supabase
    .from('device_stats')
    .insert([{ device_id: id, type: scanType }])
    .select();

  if (insertErr) {
    return NextResponse.json({
      success: false,
      step: 'INSERT_DEVICE_STATS_FAILED',
      errorMessage: insertErr.message,
      errorDetails: insertErr.details,
      errorHint: insertErr.hint,
      usedKeyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON_KEY'
    });
  }

  // 3. Cek Eksekusi Update Counter
  const { error: updateErr } = await supabase.rpc('increment_scans', { device_id_input: id, scan_type: scanType });

  return NextResponse.json({
    success: true,
    message: 'BERHASIL INSERT DATA!',
    insertedRecord: insertData,
    usedKeyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON_KEY'
  });
}
