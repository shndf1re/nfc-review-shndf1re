import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';
import { createClient } from '@supabase/supabase-js';
import { SITE_CONFIG } from '../../../lib/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, shippingAddress, storeName, targetUrl, qty, courierName, shippingCost, destinationCity, postalCode } = body;

    const cleanName = String(customerName || '').trim();
    const cleanPhone = String(customerPhone || '').trim();
    const cleanAddress = String(shippingAddress || '').trim();
    const cleanCity = String(destinationCity || '').trim();
    const cleanPostal = String(postalCode || '').trim();
    const parsedQty = Math.max(1, parseInt(qty, 10) || 1);
    const parsedShippingCost = Math.max(0, parseFloat(shippingCost) || 0);

    if (!cleanName || !cleanPhone || !cleanAddress || !cleanCity) {
      return NextResponse.json(
        { error: 'Nama, No. WA, Kota/Kecamatan, dan Alamat Lengkap wajib diisi!' },
        { status: 400 }
      );
    }

    const PRICE_PER_ITEM = SITE_CONFIG.pricing?.discountPrice || 60000;
    const itemsTotal = parsedQty * PRICE_PER_ITEM;
    const totalPrice = itemsTotal + parsedShippingCost;
    const orderId = `NFC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const fullShippingAddress = `${cleanAddress}, ${cleanCity} (${cleanPostal})`;

    // 1. Simpan Transaksi ke Database Supabase
    const { error: dbError } = await supabase.from('orders').insert([
      {
        order_id: orderId,
        customer_name: cleanName,
        customer_phone: cleanPhone,
        shipping_address: fullShippingAddress,
        destination_city: cleanCity,
        store_name: String(storeName || '').trim() || null,
        target_url: String(targetUrl || '').trim() || null,
        quantity: parsedQty,
        shipping_cost: parsedShippingCost,
        courier: courierName || 'Lokal Samarinda Free',
        total_price: totalPrice,
        payment_status: 'pending',
      },
    ]);

    if (dbError) {
      return NextResponse.json({ error: 'DB Insert Error: ' + dbError.message }, { status: 500 });
    }

    // 2. Rincian Tagihan untuk Midtrans
    const itemDetails = [
      {
        id: 'PAPAN-NFC-AKRILIK',
        price: PRICE_PER_ITEM,
        quantity: parsedQty,
        name: 'Papan Akrilik NFC Google Review',
      },
    ];

    if (parsedShippingCost > 0) {
      itemDetails.push({
        id: 'ONGKOS-KIRIM',
        price: parsedShippingCost,
        quantity: 1,
        name: `Ongkir (${courierName || 'Ekspedisi'})`,
      });
    }

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: totalPrice,
      },
      customer_details: {
        first_name: cleanName,
        phone: cleanPhone,
      },
      item_details: itemDetails,
      enabled_payments: ['qris', 'gopay', 'shopeepay', 'bca_va', 'bni_va', 'bri_va', 'mandiri_va', 'permata_va'],
    };

    const transaction = await snap.createTransaction(parameter);
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
