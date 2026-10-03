import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    const tripaySignature = req.headers.get('x-callback-signature');
    const privateKey = process.env.TRIPAY_PRIVATE_KEY || '';

    const signature = crypto
      .createHmac('sha256', privateKey)
      .update(rawBody)
      .digest('hex');

    if (signature !== tripaySignature) {
      console.error('Callback Signature Mismatch!');
      return NextResponse.json({ success: false, message: 'Invalid Signature' }, { status: 403 });
    }

    const callbackEvent = req.headers.get('x-callback-event');
    if (callbackEvent && callbackEvent !== 'payment_status') {
      return NextResponse.json({ success: true, message: 'Event Ignored' });
    }

    const { merchant_ref, status } = body;

    if (status === 'PAID') {
      // 1. Cari Order di database
      const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', merchant_ref)
        .maybeSingle();

      if (fetchErr || !order) {
        console.error('Order tidak ditemukan di Supabase:', merchant_ref);
        return NextResponse.json({ success: false, message: 'Order Not Found' }, { status: 404 });
      }

      if (['paid', 'PAID', 'Lunas'].includes(order.payment_status)) {
        return NextResponse.json({ success: true, message: 'Order sudah lunas sebelumnya' });
      }

      // 2. Update status order jadi paid
      await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('order_id', merchant_ref);

      // 3. Potong stok di tabel inventory
      const purchasedQty = parseInt(order.quantity, 10) || 1;

      const { data: inventoryItem } = await supabase
        .from('inventory')
        .select('id, stock_quantity')
        .eq('id', 1)
        .maybeSingle();

      if (inventoryItem) {
        const currentStock = parseInt(inventoryItem.stock_quantity, 10) || 0;
        const newStock = Math.max(0, currentStock - purchasedQty);

        await supabase
          .from('inventory')
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventoryItem.id);

        console.log(`STOK ONLINE BERHASIL DIPOTONG! Dari ${currentStock} menjadi ${newStock}`);
      }

      return NextResponse.json({ success: true, message: 'Pembayaran Lunas & Stok Berhasil Dipotong' });
    }

    if (status === 'EXPIRED' || status === 'FAILED') {
      await supabase
        .from('orders')
        .update({ payment_status: status.toLowerCase() })
        .eq('order_id', merchant_ref);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Callback Server Error:', error);
    return NextResponse.json({ success: false, message: 'Server Error: ' + error.message }, { status: 500 });
  }
}
