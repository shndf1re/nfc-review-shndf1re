import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib disertakan.' }, { status: 400 });
    }

    // Update status pesanan di database menjadi "Dibatalkan"
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'Dibatalkan' })
      .eq('order_id', orderId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Pesanan berhasil dibatalkan.' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
