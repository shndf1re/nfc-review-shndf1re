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

    // 3. Validasi: Jika tidak cocok, tolak request
    if (signature !== tripaySignature) {
      return NextResponse.json({ success: false, message: 'Invalid Signature' }, { status: 403 });
    }

    // 4. Cek jenis Event dari Tripay (pastikan event payment_status)
    const callbackEvent = req.headers.get('x-callback-event');
    if (callbackEvent !== 'payment_status') {
      return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    const { merchant_ref, status } = body;

    // 5. Proses jika status pembayaran Lunas (PAID)
    if (status === 'PAID') {
      // Ambil data order dari Supabase terlebih dahulu
      const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', merchant_ref)
        .single();

      if (fetchErr || !order) {
        console.error('Order tidak ditemukan:', merchant_ref);
        return NextResponse.json({ success: false, message: 'Order Not Found' }, { status: 404 });
      }

      // Hindari pemotongan stok berulang jika sudah pernah ditandai paid/Lunas
      if (order.payment_status === 'paid' || order.payment_status === 'PAID' || order.payment_status === 'Lunas') {
        return NextResponse.json({ success: true, message: 'Order sudah lunas sebelumnya' });
      }

      // A. Update status order menjadi 'paid'
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('order_id', merchant_ref);

      if (updateErr) {
        console.error('Supabase Update Error:', updateErr);
        return NextResponse.json({ success: false, message: 'Database Update Error' }, { status: 500 });
      }

      // B. Potong stok barang otomatis pada tabel products
      const purchasedQty = parseInt(order.quantity, 10) || 1;

      const { data: product, error: prodErr } = await supabase
        .from('products')
        .select('id, stock')
        .eq('sku', 'NFC-ACRYLIC')
        .single();

      if (!prodErr && product) {
        const newStock = Math.max(0, (product.stock || 0) - purchasedQty);
        
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', product.id);

        console.log(`Stok berhasil dipotong! Stok baru: ${newStock}`);
      } else {
        console.warn('Produk SKU NFC-ACRYLIC tidak ditemukan di tabel products, pemotongan stok dilewati.');
      }

      return NextResponse.json({ success: true, message: 'Pembayaran berhasil & stok diperbarui' });
    }

    // 6. Jika status pembayaran EXPIRED atau FAILED
    if (status === 'EXPIRED' || status === 'FAILED') {
      await supabase
        .from('orders')
        .update({ payment_status: status.toLowerCase() })
        .eq('order_id', merchant_ref);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Callback Error:', error);
    return NextResponse.json({ success: false, message: 'Server Error: ' + error.message }, { status: 500 });
  }
}
