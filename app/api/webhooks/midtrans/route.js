import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req) {
  try {
    const notification = await req.json();
    
    const {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus
    } = notification;

    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';

    // PROTEKSI SIBER: Verifikasi Signature Hash Key SHA-512
    const hashPayload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    const expectedSignature = crypto.createHash('sha512').update(hashPayload).digest('hex');

    if (signatureKey !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid Signature Key. Akses ditolak!' }, { status: 403 });
    }

    // Tentukan Status Pembayaran
    let newPaymentStatus = 'pending';

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'accept' || !fraudStatus) {
        newPaymentStatus = 'Lunas';
      }
    } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
      newPaymentStatus = 'Gagal';
    }

    // Update Status di Database Orders
    const { data: orderData, error: updateErr } = await supabase
      .from('orders')
      .update({ payment_status: newPaymentStatus })
      .eq('order_id', orderId)
      .select()
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: 'DB Update Error: ' + updateErr.message }, { status: 500 });
    }

    // JIKA PEMBAYARAN SUKSES (LUNAS): MASUKKAN KE SALES & POTONG STOK
    if (newPaymentStatus === 'Lunas' && orderData) {
      
      // 1. Tambahkan ke Laporan Penjualan (sales)
      await supabase.from('sales').insert([
        {
          customer_name: orderData.customer_name,
          quantity: orderData.quantity,
          total_price: orderData.total_price,
          payment_status: 'Lunas',
          notes: `Web Order: ${orderData.store_name || '-'} (ID: ${orderId})`
        }
      ]);

      // 2. Ambil Stok saat ini & potong otomatis
      const { data: invData } = await supabase
        .from('inventory')
        .select('*')
        .ilike('item_name', '%Papan Akrilik%')
        .maybeSingle();

      if (invData) {
        const currentStock = Number(invData.stock_quantity) || 0;
        const updatedStock = Math.max(0, currentStock - Number(orderData.quantity));

        await supabase
          .from('inventory')
          .update({ stock_quantity: updatedStock })
          .eq('id', invData.id);
      }
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });

  } catch (err) {
    return NextResponse.json({ error: 'Webhook Handler Error: ' + err.message }, { status: 500 });
  }
}
