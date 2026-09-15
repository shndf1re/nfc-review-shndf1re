import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req) {
  try {
    const { orderDbId, resiNumber, courierCode } = await req.json();

    if (!orderDbId || !resiNumber) {
      return NextResponse.json({ error: 'Order ID & Nomor Resi wajib diisi.' }, { status: 400 });
    }

    const biteshipApiKey = process.env.BITESHIP_API_KEY || '';
    if (!biteshipApiKey) {
      return NextResponse.json({ error: 'Biteship API Key belum dikonfigurasi.' }, { status: 500 });
    }

    // Ekstrak kode kurir sederhana (misal 'JNE (Reguler)' -> 'jne')
    let cleanCourier = (courierCode || '').toLowerCase();
    if (cleanCourier.includes('jne')) cleanCourier = 'jne';
    else if (cleanCourier.includes('j&t') || cleanCourier.includes('jnt')) cleanCourier = 'jnt';
    else if (cleanCourier.includes('pos')) cleanCourier = 'pos';
    else if (cleanCourier.includes('sicepat')) cleanCourier = 'sicepat';
    else if (cleanCourier.includes('tiki')) cleanCourier = 'tiki';
    else cleanCourier = 'jne'; // fallback default

    // Panggil API Tracking Gratis dari Biteship
    const biteshipRes = await fetch(
      `https://api.biteship.com/v1/trackings/${resiNumber}/couriers/${cleanCourier}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${biteshipApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const biteshipData = await biteshipRes.json();

    if (!biteshipRes.ok || !biteshipData.success) {
      return NextResponse.json({ 
        message: 'Resi belum terdeteksi di sistem kurir atau masih diproses.',
        status: 'on_delivery'
      });
    }

    const trackingStatus = (biteshipData.status || '').toLowerCase();

    // Jika status dari kurir sudah 'delivered' (sampai tujuan)
    if (trackingStatus === 'delivered') {
      // Update status di Supabase menjadi Selesai
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ payment_status: 'Selesai' })
        .eq('id', orderDbId);

      if (updateErr) {
        return NextResponse.json({ error: 'Gagal update ke DB: ' + updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ 
        isFinished: true, 
        message: 'Pesanan telah selesai diantar oleh kurir!',
        status: 'delivered' 
      });
    }

    return NextResponse.json({ 
      isFinished: false, 
      status: trackingStatus 
    });

  } catch (err) {
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
