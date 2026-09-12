import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Inisialisasi Midtrans Snap SDK (Mode Sandbox)
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, shippingAddress, storeName, targetUrl, qty } = body;

    // VALIDASI INPUT (Anti-Malicious/XSS Input)
    const cleanName = String(customerName || '').trim();
    const cleanPhone = String(customerPhone || '').trim();
    const cleanAddress = String(shippingAddress || '').trim();
    const cleanStore = String(storeName || '').trim();
    const cleanUrl = String(targetUrl || '').trim();
    const parsedQty = Math.max(1, parseInt(qty, 10) || 1);

    if (!cleanName || !cleanPhone || !cleanAddress) {
      return NextResponse.json(
        { error: 'Nama, Nomor WhatsApp, dan Alamat wajib diisi!' },
        { status: 400 }
      );
    }

    // PROTEKSI HARGA (Backend Price Guard - Anti Tampering)
    // Harga per papan ditetapkan Rp 150.000 di server (Tidak bisa dicolong/diubah dari frontend)
    const PRICE_PER_ITEM = 150000;
    const totalPrice = parsedQty * PRICE_PER_ITEM;
    const orderId = `NFC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Simpan Transaksi ke Database Supabase dengan status "pending"
    const { error: dbError } = await supabase.from('orders').insert([
      {
        order_id: orderId,
        customer_name: cleanName,
        customer_phone: cleanPhone,
        shipping_address: cleanAddress,
        store_name: cleanStore || null,
        target_url: cleanUrl || null,
        quantity: parsedQty,
        total_price: totalPrice,
        payment_status: 'pending',
      },
    ]);

    if (dbError) {
      return NextResponse.json({ error: 'Gagal membuat pesanan di database: ' + dbError.message }, { status: 500 });
    }

    // 2. Buat Parameter Transaksi Midtrans
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: totalPrice,
      },
      customer_details: {
        first_name: cleanName,
        phone: cleanPhone,
      },
      item_details: [
        {
          id: 'PAPAN-NFC-AKRILIK',
          price: PRICE_PER_ITEM,
          quantity: parsedQty,
          name: 'Papan Akrilik NFC Google Review',
        },
      ],
      // Mengizinkan QRIS dan Virtual Account (BCA, Mandiri, BNI, BRI, Permata)
      enabled_payments: ['qris', 'gopay', 'shopeepay', 'bca_va', 'bni_va', 'bri_va', 'mandiri_va', 'permata_va'],
    };

    // 3. Request Snap Token dari Midtrans
    const transaction = await snap.createTransaction(parameter);

    // 4. Update Token Snap ke Supabase
    await supabase.from('orders').update({ snap_token: transaction.token }).eq('order_id', orderId);

    return NextResponse.json({
      success: true,
      token: transaction.token,
      orderId: orderId,
    });

  } catch (err) {
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
