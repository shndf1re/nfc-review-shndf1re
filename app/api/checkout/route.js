import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
      paymentMethod
    } = await req.json();

    const BASE_PROMO_PRICE = 50000;
    const ORIGINAL_PRICE = 100000;
    const itemUnitPrice = isExpiredPromo ? ORIGINAL_PRICE : BASE_PROMO_PRICE;

    const currentQty = Math.max(1, parseInt(qty, 10) || 1);
    const rawSubtotal = itemUnitPrice * currentQty;
    const discountVal = parseFloat(discountAmount) || 0;
    
    const finalSubtotal = Math.max(0, rawSubtotal - discountVal);
    const shipCostVal = parseFloat(shippingCost) || 0;
    const grossAmount = Math.round(finalSubtotal + shipCostVal);

    const uniqueSuffix = Math.floor(100 + Math.random() * 900);
    const orderId = `NFC-${Date.now()}-${uniqueSuffix}`;

    const apiKey = process.env.TRIPAY_API_KEY || '';
    const privateKey = process.env.TRIPAY_PRIVATE_KEY || '';
    const merchantCode = process.env.TRIPAY_MERCHANT_CODE || '';

    const signature = crypto
      .createHmac('sha256', privateKey)
      .update(merchantCode + orderId + grossAmount)
      .digest('hex');

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

    const tripayPayload = {
      method: paymentMethod || 'QRIS2', 
      merchant_ref: orderId,
      amount: grossAmount,
      customer_name: customerName || 'Pelanggan NFC',
      customer_email: 'buyer@reviewmaps.link', 
      customer_phone: customerPhone || '080000000000',
      order_items: orderItems,
      return_url: 'https://reviewmaps.link/track', // <--- MENGARAHKAN OTOMATIS KE HALAMAN LACAK RESI
      expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), 
      signature: signature
    };

    const axiosOptions = {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    if (process.env.FIXIE_URL) {
      try {
        const { HttpsProxyAgent } = await import('https-proxy-agent');
        axiosOptions.httpsAgent = new HttpsProxyAgent(process.env.FIXIE_URL);
        // Menonaktifkan default proxy Axios agar fokus menggunakan HttpsProxyAgent
        axiosOptions.proxy = false; 
      } catch (err) {
        console.error('Proxy Gagal Dimuat, melanjutkan tanpa proxy:', err);
      }
    }

    // Dynamic import Axios agar aman saat build Vercel
    const axios = (await import('axios')).default;
    
    const tripayRes = await axios.post('https://tripay.co.id/api/transaction/create', tripayPayload, axiosOptions);
    const tripayData = tripayRes.data;

    if (!tripayData.success) {
      return NextResponse.json({ error: 'Gagal membuat transaksi Tripay: ' + (tripayData.message || 'Error API') }, { status: 400 });
    }

    const checkoutUrl = tripayData.data.checkout_url;

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
      return NextResponse.json({ error: 'Gagal menyimpan transaksi ke database: ' + dbErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutUrl,
      orderId: orderId,
      order: orderData
    });

  } catch (err) {
    console.error('Checkout API Error:', err);
    // Menangkap pesan error spesifik dari Axios jika Tripay menolak
    const errorMessage = err.response?.data?.message || err.message;
    return NextResponse.json({ error: 'Server Error: ' + errorMessage }, { status: 500 });
  }
}
