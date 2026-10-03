import { NextResponse } from 'next/server';
import { getDevice, checkPin, supabaseAdmin, DEFAULT_PIN } from '@/lib/setup-server';

export const dynamic = 'force-dynamic';

// POST /api/setup/:id/reset  body: { pin }
// Reset papan oleh pelanggan -> data toko dihapus & PIN kembali ke default 000000
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { data: device, error } = await getDevice(id);
    if (error) return NextResponse.json({ error: 'Gagal memuat data kartu.' }, { status: 500 });
    if (!device) return NextResponse.json({ error: 'ID Kartu tidak ditemukan.' }, { status: 404 });
    if (!device.is_active) return NextResponse.json({ error: 'Papan ini belum aktif, tidak perlu di-reset.' }, { status: 400 });
    if (!checkPin(device, body.pin)) return NextResponse.json({ error: 'PIN salah.' }, { status: 401 });

    const { error: upErr } = await supabaseAdmin
      .from('devices')
      .update({ label_name: null, target_url: null, is_active: false, pin: DEFAULT_PIN })
      .eq('id', device.id);
    if (upErr) return NextResponse.json({ error: 'Gagal mereset: ' + upErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
