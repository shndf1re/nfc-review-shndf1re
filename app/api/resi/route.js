import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { trackResi } from '@/lib/resi';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } }
);

// POST /api/resi  { resi, courier, orderDbId? }
// -> { ok, summary, detail, history[], delivered }. Jika delivered & orderDbId -> order otomatis "Selesai".
export async function POST(req) {
  try {
    const { resi, courier, orderDbId } = await req.json().catch(() => ({}));
    if (!resi) return NextResponse.json({ ok: false, message: 'Nomor resi wajib diisi.' }, { status: 400 });
    const result = await trackResi(resi, courier);
    if (result.ok && result.delivered && orderDbId) {
      const { data: order } = await supabase.from('orders').select('id, payment_status, resi_number').eq('id', orderDbId).maybeSingle();
      if (order && order.resi_number && String(order.resi_number).trim() === String(resi).trim() && order.payment_status !== 'Selesai') {
        await supabase.from('orders').update({ payment_status: 'Selesai' }).eq('id', orderDbId);
        result.orderUpdated = true;
      }
    }
    return NextResponse.json(result, { status: result.code === 'NO_KEY' ? 503 : 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'Server error.' }, { status: 500 });
  }
}
