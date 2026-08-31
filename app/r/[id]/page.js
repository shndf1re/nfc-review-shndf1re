import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RedirectPage({ params, searchParams }) {
  // 1. Await params & searchParams agar kompatibel penuh dengan Next.js App Router
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const id = resolvedParams?.id;
  const source = resolvedSearchParams?.src === 'nfc' ? 'nfc' : 'qr';

  // Jika ID tidak ditemukan di URL, kembalikan ke landing page
  if (!id) {
    redirect('/');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  let targetRedirectUrl = '/';

  try {
    // 2. Cari data kartu di database Supabase
    const { data: device, error } = await supabase
      .from('devices')
      .select('target_url, is_active')
      .eq('id', id)
      .maybeSingle();

    if (!error && device && device.is_active && device.target_url) {
      targetRedirectUrl = device.target_url;

      // 3. REKAM LOG STATISTIK KE TABEL device_stats SEBELUM REDIRECT
      await supabase.from('device_stats').insert([
        {
          device_id: id,
          type: source
        }
      ]);
    } else if (device && !device.is_active) {
      // Jika kartu terdaftar tapi belum aktif, arahkan ke halaman activation/setup
      targetRedirectUrl = `/setup/${id}`;
    }
  } catch (err) {
    console.error('Error logging stats or redirecting:', err);
    targetRedirectUrl = '/';
  }

  // 4. Eksekusi Redirect Langsung
  redirect(targetRedirectUrl);
}
