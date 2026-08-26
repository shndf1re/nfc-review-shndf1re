import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function RedirectPage({ params }) {
  const { id } = params;

  // 1. Cari data perangkat berdasarkan Unique ID di Supabase
  const { data: device, error } = await supabase
    .from('devices')
    .select('target_url, is_active')
    .eq('id', id)
    .single();

  // 2. Jika kartu terdaftar, berstatus AKTIF, dan memiliki link target Google Review
  if (device && device.is_active && device.target_url) {
    // Catat statistik tap/scan secara background (opsional jika tabel stats ada)
    await supabase.from('device_stats').insert([{ device_id: id, type: 'scan' }]).catch(() => {});

    // Lempar pengunjung langsung ke Halaman Google Review Toko
    redirect(device.target_url);
  }

  // 3. JIKA KARTU BELUM TERDAFTAR / BELUM DI-SETUP:
  // Otomatis lemparkan pengunjung ke Landing Page Utama web Anda (Halaman /)
  redirect('/');
}
