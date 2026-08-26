import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RedirectPage({ params }) {
  const { id } = params;

  if (!id) {
    redirect('/');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  let targetRedirectUrl = '/';

  try {
    // Cari ID Kartu/Akrilik di Database
    const { data: device, error } = await supabase
      .from('devices')
      .select('target_url, is_active')
      .eq('id', id)
      .maybeSingle();

    // Jika kartu ditemukan, status aktif, dan memiliki link Google Review
    if (!error && device && device.is_active && device.target_url) {
      targetRedirectUrl = device.target_url;

      // Catat statistik interaksi secara background (opsional)
      await supabase
        .from('device_stats')
        .insert([{ device_id: id, type: 'nfc' }])
        .catch(() => {});
    }
  } catch (err) {
    console.error('Error fetching device redirect:', err);
    targetRedirectUrl = '/';
  }

  // Lakukan redirect di luar blok try-catch agar NEXT_REDIRECT tidak terputus
  redirect(targetRedirectUrl);
}
