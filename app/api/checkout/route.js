import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Inisialisasi Midtrans Snap SDK
const snap = new midtransClient.Snap({
  isProduction: false, // Ubah ke true jika sudah live production
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
});

export async function POST(req) {
  try {
    const {
      customerName,
      customerPhone,
      shippingAddress,
      destinationCity,
      postalCode,
      storeName,
      targetUrl,
      qty,
      courierName,
      shippingCost,
      isExpiredPromo,
      discountAmount
    } = await req.json();

    // 1. Tentukan Harga per Pcs berdasarkan Promo Timer
    const BASE_PROMO_PRICE = 100000;
    const ORIGINAL_PRICE = 150000;
    const itemUnitPrice = isExpiredPromo ? ORIGINAL_PRICE : BASE_PROMO_PRICE;

    const currentQty = Math.max(1, parseInt(qty, 10) || 1);
    const rawSubtotal = itemUnitPrice * currentQty;
    const discountVal = parseFloat(discountAmount) || 0;
    
    // Subtotal barang setelah diskon kupon
    const finalSubtotal = Math.max(0, rawSubtotal - discountVal);
    const shipCostVal = parseFloat(shippingCost) || 0;
    
    // Total Tagihan Akhir
    const grossAmount = finalSubtotal + shipCostVal;

    // 2. Buat Order ID Unik
    const uniqueSuffix = Math.floor(100 + Math.random() * 900);
    const orderId = `NFC-${Date.now()}-${uniqueSuffix}`;

    // 3. Rincian Item untuk Midtrans Snap
    const itemDetails = [
      {
        id: 'NFC-ACRYLIC',
        price: itemUnitPrice,
        quantity: currentQty,
        name: 'Papan Akrilik NFC'
      }
    ];

    // Jika ada diskon kupon, masukkan sebagai item potongan harga
    if (discountVal > 0) {
      itemDetails.push({
        id: 'DISCOUNT-PROMO',
        price: -Math.abs(discountVal),
        quantity: 1,
        name: 'Potongan Kode Promo'
      });
    }

    // Jika ada ongkir
    if (shipCostVal > 0) {
      itemDetails.push({
        id: 'SHIPPING-FEE',
        price: shipCostVal,
        quantity: 1,
        name: `Ongkir (${courierName || 'Ekspedisi'})`
      });
    }

    // 4. Parameter Transaksi Midtrans
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount
      },
      item_details: itemDetails,
      customer_details: {
        first_name: customerName,
        phone: customerPhone,
        shipping_address: {
          first_name: customerName,
          phone: customerPhone,
          address: shippingAddress,
          city: destinationCity,
          postal_code: postalCode
        }
      }
    };

    // Request Snap Token ke Midtrans
    const snapResponse = await snap.createTransaction(parameter);
    const snapToken = snapResponse.token;

    // 5. Simpan Pesanan ke Tabel 'orders' di Supabase
    const { data: orderData, error: dbErr } = await supabase
      .from('orders')
      .insert([
        {
          order_id: orderId,
          customer_name: customerName,
          customer_phone: customerPhone,
          shipping_address: `${shippingAddress}, ${destinationCity} (${postalCode})`,
          destination_city: destinationCity,
          store_name: storeName || null,
          target_url: targetUrl || null,
          quantity: currentQty,
          courier: courierName || 'Reguler',
          shipping_cost: shipCostVal,
          total_price: grossAmount,
          payment_status: 'pending',
          snap_token: snapToken
        }
      ])
      .select()
      .single();

    if (dbErr) {
      console.error('Error insert to Supabase orders:', dbErr);
      return NextResponse.json({ error: 'Gagal menyimpan transaksi ke database: ' + dbErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      token: snapToken,
      orderId: orderId,
      order: orderData
    });

  } catch (err) {
    console.error('Checkout API Error:', err);
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
