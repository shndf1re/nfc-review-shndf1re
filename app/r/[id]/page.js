import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RedirectPage({ params, searchParams }) {
  // 1. Await params & searchParams
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const id = resolvedParams?.id;
  const source = resolvedSearchParams?.src === 'nfc' ? 'nfc' : 'qr';

  if (!id) {
    redirect('/');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  let targetRedirectUrl = '/';

  try {
    // 2. Cari data kartu dengan .ilike agar TAHAN terhadap beda huruf besar/kecil (Case-Insensitive)
    const { data: device, error } = await supabase
      .from('devices')
      .select('id, target_url, is_active')
      .ilike('id', id)
      .maybeSingle();

    if (error) {
      console.error('Supabase Query Error:', error.message);
    }

    // 3. Jika kartu ditemukan dan aktif serta ada target_url
    if (device && device.is_active && device.target_url) {
      targetRedirectUrl = device.target_url;

      // Rekam statistik tap/scan
      await supabase.from('device_stats').insert([
        {
          device_id: device.id,
          type: source
        }
      ]);
    } else if (device && !device.is_active) {
      // Jika kartu terdaftar di DB tetapi is_active = false
      targetRedirectUrl = `/setup/${device.id}`;
    } else {
      // Jika ID kartu sama sekali TIDAK ditemukan di database
      console.log(`ID Kartu ${id} tidak ditemukan di database.`);
      targetRedirectUrl = `/setup/${id}`;
    }
  } catch (err) {
    console.error('Error logging stats or redirecting:', err);
    targetRedirectUrl = '/';
  }

  // 4. Eksekusi Redirect
  redirect(targetRedirectUrl);
}
