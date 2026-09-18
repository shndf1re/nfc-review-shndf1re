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

    // 1. Ambil Signature dari header yang dikirim Tripay
    const tripaySignature = req.headers.get('x-callback-signature');
    const privateKey = process.env.TRIPAY_PRIVATE_KEY || '';

    // 2. Buat Signature pembanding untuk validasi keamanan
    const signature = crypto
      .createHmac('sha256', privateKey)
      .update(rawBody)
      .digest('hex');

    // 3. Validasi Signature
    if (signature !== tripaySignature) {
      console.error('Callback Signature Mismatch!');
      return NextResponse.json({ success: false, message: 'Invalid Signature' }, { status: 403 });
    }

    // 4. Filter Event Pembayaran dari Tripay
    const callbackEvent = req.headers.get('x-callback-event');
    if (callbackEvent !== 'payment_status') {
      return NextResponse.json({ success: true, message: 'Event Ignored' });
    }

    const { merchant_ref, status } = body;

    // 5. Jika Status Pembayaran LUNAS (PAID)
    if (status === 'PAID') {
      // A. Ambil Data Order dari tabel 'orders'
      const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', merchant_ref)
        .single();

      if (fetchErr || !order) {
        console.error('Order tidak ditemukan di Supabase:', merchant_ref);
        return NextResponse.json({ success: false, message: 'Order Not Found' }, { status: 404 });
      }

      // Cegah pemotongan ganda jika status pesanan sudah 'paid' atau 'Lunas'
      if (order.payment_status === 'paid' || order.payment_status === 'PAID' || order.payment_status === 'Lunas') {
        return NextResponse.json({ success: true, message: 'Order sudah lunas sebelumnya' });
      }

      // B. Update Status Pesanan Menjadi 'paid'
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('order_id', merchant_ref);

      if (updateErr) {
        console.error('Gagal update status pesanan:', updateErr);
      }

      // C. Potong Stok Akrilik Otomatis di Tabel 'inventory' (Kolom 'stock_quantity')
      const purchasedQty = parseInt(order.quantity, 10) || 1;

      // Ambil data barang Papan Akrilik (id = 1) dari tabel inventory
      const { data: inventoryItem, error: invErr } = await supabase
        .from('inventory')
        .select('id, stock_quantity')
        .eq('id', 1)
        .single();

      if (!invErr && inventoryItem) {
        const currentStock = parseInt(inventoryItem.stock_quantity, 10) || 0;
        const newStock = Math.max(0, currentStock - purchasedQty);

        const { error: stockUpdateErr } = await supabase
          .from('inventory')
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);

        if (stockUpdateErr) {
          console.error('Gagal update stock_quantity di tabel inventory:', stockUpdateErr);
        } else {
          console.log(`STOK SUCCESS! Stok Papan Akrilik terpotong ${purchasedQty} pcs. Dari ${currentStock} menjadi ${newStock}`);
        }
      } else {
        console.error('Gagal mengambil data dari tabel inventory:', invErr);
      }

      return NextResponse.json({ success: true, message: 'Pembayaran Lunas & Stok Inventory Berhasil Dipotong' });
    }

    // 6. Jika Status EXPIRED / FAILED
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
