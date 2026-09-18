import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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
      discountAmount,
      paymentMethod // Jika dikirim dari frontend ('BCAVA', 'BRIVA', 'QRIS2', dll)
    } = await req.json();

    // 1. Hitung Harga per Item berdasarkan Promo Timer
    const BASE_PROMO_PRICE = 65000;
    const ORIGINAL_PRICE = 100000;
    const itemUnitPrice = isExpiredPromo ? ORIGINAL_PRICE : BASE_PROMO_PRICE;

    const currentQty = Math.max(1, parseInt(qty, 10) || 1);
    const rawSubtotal = itemUnitPrice * currentQty;
    const discountVal = parseFloat(discountAmount) || 0;
    
    // Subtotal barang setelah diskon kupon
    const finalSubtotal = Math.max(0, rawSubtotal - discountVal);
    const shipCostVal = parseFloat(shippingCost) || 0;
    
    // Total Tagihan Akhir (Gross Amount)
    const grossAmount = Math.round(finalSubtotal + shipCostVal);

    // 2. Buat Order ID Unik
    const uniqueSuffix = Math.floor(100 + Math.random() * 900);
    const orderId = `NFC-${Date.now()}-${uniqueSuffix}`;

    // 3. Kredensial Tripay dari Environment Variables
    const apiKey = process.env.TRIPAY_API_KEY || '';
    const privateKey = process.env.TRIPAY_PRIVATE_KEY || '';
    const merchantCode = process.env.TRIPAY_MERCHANT_CODE || '';

    // 4. Buat Signature HMAC-SHA256 sesuai standar keamanan Tripay
    const signature = crypto
      .createHmac('sha256', privateKey)
      .update(merchantCode + orderId + grossAmount)
      .digest('hex');

    // 5. Susun Rincian Item (Order Items) untuk Tripay
    const orderItems = [
      {
        sku: 'NFC-ACRYLIC',
        name: 'Papan Akrilik NFC',
        price: itemUnitPrice,
        quantity: currentQty
      }
    ];

    if (discountVal > 0) {
      orderItems.push({
        sku: 'DISCOUNT-PROMO',
        name: 'Potongan Kode Promo',
        price: -Math.abs(Math.round(discountVal)),
        quantity: 1
      });
    }

    if (shipCostVal > 0) {
      orderItems.push({
        sku: 'SHIPPING-FEE',
        name: `Ongkir (${courierName || 'Ekspedisi'})`,
        price: Math.round(shipCostVal),
        quantity: 1
      });
    }

    // 6. Payload Request Transaksi ke Tripay
    // Menggunakan paymentMethod jika ada, atau default 'QRIS2'
    const tripayPayload = {
      method: paymentMethod || 'QRIS2', 
      merchant_ref: orderId,
      amount: grossAmount,
      customer_name: customerName || 'Pelanggan NFC',
      customer_email: 'pembeli@reviewmaps.link', 
      customer_phone: customerPhone || '08000000000',
      order_items: orderItems,
      return_url: 'https://reviewmaps.link', 
      expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), 
      signature: signature
    };

    // 7. Konfigurasi Fetch menggunakan Fixie Proxy jika FIXIE_URL tersedia
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tripayPayload)
    };

    if (process.env.FIXIE_URL) {
      fetchOptions.agent = new HttpsProxyAgent(process.env.FIXIE_URL);
    }

    // Hit API Tripay Production lewat IP Statis Fixie
    const tripayRes = await fetch('https://tripay.co.id/api/transaction/create', fetchOptions);
    const tripayData = await tripayRes.json();

    if (!tripayData.success) {
      console.error('Tripay API Error:', tripayData);
      return NextResponse.json({ error: 'Gagal membuat transaksi Tripay: ' + (tripayData.message || 'Error API') }, { status: 400 });
    }

    const checkoutUrl = tripayData.data.checkout_url;

    // 8. Simpan Pesanan ke Tabel 'orders' di Supabase
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
          checkout_url: checkoutUrl
        }
      ])
      .select()
      .single();

    if (dbErr) {
      console.error('Error insert to Supabase orders:', dbErr);
      return NextResponse.json({ error: 'Gagal menyimpan transaksi ke database: ' + dbErr.message }, { status: 500 });
    }

    // 9. Return Response Sukses
    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutUrl,
      orderId: orderId,
      order: orderData
    });

  } catch (err) {
    console.error('Checkout API Error:', err);
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
