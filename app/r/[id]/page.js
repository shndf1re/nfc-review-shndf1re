import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function RedirectPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const { data: device, error } = await supabase
    .from('devices')
    .select('target_url, is_active')
    .eq('id', id)
    .single();

  if (error || !device) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Perangkat Tidak Ditemukan</h2>
        <p>Tag NFC atau QR Code ini belum terdaftar di sistem.</p>
      </div>
    );
  }

  if (device.is_active && device.target_url) {
    redirect(device.target_url);
  }

  redirect(`/setup/${id}`);
}
