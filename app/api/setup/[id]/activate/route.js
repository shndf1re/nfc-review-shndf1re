import { NextResponse } from 'next/server';
import { getDevice, publicDevice, checkPin, validateNewPin, formatReviewUrl, isAllowedReviewUrl, supabaseAdmin } from '@/lib/setup-server';

export const dynamic = 'force-dynamic';

// POST /api/setup/:id/activate
// body: { pin, storeName, reviewUrl, newPin }
// - Kartu belum aktif: pin = 000000 (atau PIN lama), newPin WAJIB.
// - Kartu aktif (ubah data): pin = PIN pelanggan, newPin opsional.
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const storeName = String(body.storeName || '').trim();
    const reviewUrl = formatReviewUrl(body.reviewUrl);
    const newPin = String(body.newPin || '').trim();

    if (!storeName) return NextResponse.json({ error: 'Nama Toko / Usaha wajib diisi.' }, { status: 400 });
    if (!reviewUrl) return NextResponse.json({ error: 'Link Google Review wajib diisi.' }, { status: 400 });
    if (!isAllowedReviewUrl(reviewUrl)) {
      return NextResponse.json({ error: 'Link harus link Google Review / Google Maps (contoh: search.google.com/local/writereview?placeid=... atau g.page/...).' }, { status: 400 });
    }

    const { data: device, error } = await getDevice(id);
    if (error) return NextResponse.json({ error: 'Gagal memuat data kartu.' }, { status: 500 });
    if (!device) return NextResponse.json({ error: 'ID Kartu tidak ditemukan.' }, { status: 404 });

    if (!checkPin(device, body.pin)) {
      return NextResponse.json({ error: device.is_active ? 'PIN salah. Gunakan PIN yang Anda buat saat aktivasi.' : 'PIN salah. PIN default kartu baru adalah 000000.' }, { status: 401 });
    }

    const update = { label_name: storeName, target_url: reviewUrl, is_active: true };
    if (!device.is_active || newPin) {
      const pinErr = validateNewPin(newPin);
      if (pinErr) return NextResponse.json({ error: pinErr }, { status: 400 });
      update.pin = newPin;
    }

    const { data: updated, error: upErr } = await supabaseAdmin.from('devices').update(update).eq('id', device.id).select('id, is_active, label_name, target_url').maybeSingle();
    if (upErr) return NextResponse.json({ error: 'Gagal menyimpan: ' + upErr.message }, { status: 500 });

    return NextResponse.json({ success: true, wasActive: Boolean(device.is_active), pinChanged: Boolean(update.pin), device: publicDevice(updated) });
  } catch (e) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
