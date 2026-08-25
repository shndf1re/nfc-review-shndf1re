import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export default async function RedirectPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const id = resolvedParams?.id;
  const source = resolvedSearchParams?.src || 'nfc'; // Default ke nfc jika tanpa parameter

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // 1. Cari data kartu berdasarkan ID
  const { data: device, error } = await supabase
    .from('devices')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !device) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
        <h2>❌ Perangkat Tidak Ditemukan</h2>
        <p>Kartu NFC / QR Code ini belum terdaftar di sistem kami.</p>
      </div>
    );
  }

  // 2. Jika kartu belum diisi link Google Review
  if (!device.is_active || !device.target_url) {
    redirect(`/setup/${id}`);
  }

  // 3. Catat Hitungan Statistik (Increment Counter)
  if (source === 'qr') {
    await supabase
      .from('devices')
      .update({ qr_scans: (device.qr_scans || 0) + 1 })
      .eq('id', id);
  } else {
    await supabase
      .from('devices')
      .update({ nfc_scans: (device.nfc_scans || 0) + 1 })
      .eq('id', id);
  }

  // 4. Redirect ke Google Review Toko
  redirect(device.target_url);
}
