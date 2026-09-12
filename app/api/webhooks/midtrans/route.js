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

    // VERIFIKASI SIGNATURE KEY SHA-512
    const hashPayload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    const expectedSignature = crypto.createHash('sha512').update(hashPayload).digest('hex');

    if (signatureKey !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid Signature Key. Akses ditolak!' }, { status: 403 });
    }

    // TENTUKAN STATUS PEMBAYARAN
    let newPaymentStatus = 'pending';

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'accept' || !fraudStatus) {
        newPaymentStatus = 'Lunas';
      }
    } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
      newPaymentStatus = 'Gagal';
    }

    // UPDATE DATABASE ORDERS
    const { data: orderData, error: updateErr } = await supabase
      .from('orders')
      .update({ payment_status: newPaymentStatus })
      .eq('order_id', orderId)
      .select()
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: 'DB Update Error: ' + updateErr.message }, { status: 500 });
    }

    // JIKA LUNAS: SIMPAN PENJUALAN, POTONG STOK, & KIRIM WA AUTOMATIC
    if (newPaymentStatus === 'Lunas' && orderData) {
      
      const actualTotalPrice = parseFloat(orderData.total_price) || parseFloat(grossAmount) || 0;
      const actualQty = parseInt(orderData.quantity, 10) || 1;

      // 1. Simpan ke Sales
      await supabase.from('sales').insert([
        {
          customer_name: orderData.customer_name,
          quantity: actualQty,
          total_price: actualTotalPrice,
          payment_status: 'Lunas',
          notes: `Web Order Promo: ${orderData.store_name || '-'} (ID: ${orderId})`
        }
      ]);

      // 2. Potong Stok Inventory
      const { data: invData } = await supabase
        .from('inventory')
        .select('*')
        .ilike('item_name', '%Papan Akrilik%')
        .maybeSingle();

      if (invData) {
        const currentStock = Number(invData.stock_quantity) || 0;
        const updatedStock = Math.max(0, currentStock - actualQty);

        await supabase
          .from('inventory')
          .update({ stock_quantity: updatedStock })
          .eq('id', invData.id);
      }

      // 3. KIRIM WA VIA FONNTE
      const fonnteToken = process.env.FONNTE_TOKEN;
      const targetPhone = '085156534909'; // Nomor WA Admin

      if (fonnteToken) {
        const messageText = 
          `🔔 *ORDERAN BARU LUNAS (PROMO)!*\n\n` +
          `📦 *ID Order:* ${orderId}\n` +
          `👤 *Nama:* ${orderData.customer_name}\n` +
          `📞 *WA:* ${orderData.customer_phone}\n` +
          `🛍️ *Jumlah:* ${actualQty} Pcs\n` +
          `💰 *Total Bayar:* Rp ${actualTotalPrice.toLocaleString('id-ID')}\n` +
          `🏪 *Toko:* ${orderData.store_name || '-'}\n` +
          `🏠 *Alamat:* ${orderData.shipping_address}\n\n` +
          `✅ *Stok akrilik otomatis terpotong di database.*`;

        const formData = new URLSearchParams();
        formData.append('target', targetPhone);
        formData.append('message', messageText);

        await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            'Authorization': fonnteToken,
          },
          body: formData,
        });
      }
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });

  } catch (err) {
    return NextResponse.json({ error: 'Webhook Handler Error: ' + err.message }, { status: 500 });
  }
}
