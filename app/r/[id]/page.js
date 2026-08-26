import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RedirectPage({ params, searchParams }) {
  const { id } = params;
  
  // Deteksi sumber interaksi (?src=nfc atau ?src=qr)
  const source = searchParams?.src === 'nfc' ? 'nfc' : 'qr';

  if (!id) {
    redirect('/');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  let targetRedirectUrl = '/';

  try {
    // 1. Cari data kartu di database Supabase
    const { data: device, error } = await supabase
      .from('devices')
      .select('target_url, is_active')
      .eq('id', id)
      .maybeSingle();

    if (!error && device && device.is_active && device.target_url) {
      targetRedirectUrl = device.target_url;

      // 2. REKAM LOG STATISTIK KE TABEL device_stats SEBELUM REDIRECT
      await supabase.from('device_stats').insert([
        {
          device_id: id,
          type: source
        }
      ]);
    }
  } catch (err) {
    console.error('Error logging stats or redirecting:', err);
    targetRedirectUrl = '/';
  }

  // 3. Eksekusi Redirect
  redirect(targetRedirectUrl);
}
