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

    const apiKey = process.env.BINDERBYTE_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'BINDERBYTE_API_KEY belum dipasang di environment variable.' }, { status: 500 });
    }

    // Format kode ekspedisi sesuai dokumentasi BinderByte
    let courier = (courierCode || '').toLowerCase();
    if (courier.includes('jne')) courier = 'jne';
    else if (courier.includes('j&t') || courier.includes('jnt')) courier = 'jnt';
    else if (courier.includes('pos')) courier = 'pos';
    else if (courier.includes('sicepat')) courier = 'sicepat';
    else if (courier.includes('tiki')) courier = 'tiki';
    else if (courier.includes('anteraja')) courier = 'anteraja';
    else if (courier.includes('ninja')) courier = 'ninja';
    else courier = 'jne';

    // Panggil API BinderByte (API Cek Resi Gratis)
    const response = await fetch(
      `https://api.binderbyte.com/v1/track?api_key=${apiKey}&courier=${courier}&awb=${resiNumber.trim()}`
    );

    const result = await response.json();

    if (!response.ok || result.status !== 200 || !result.data) {
      return NextResponse.json({ 
        isFinished: false,
        message: result.message || 'Resi belum terdaftar atau masih diproses kurir.' 
      });
    }

    const summaryStatus = (result.data.summary?.status || '').toLowerCase();

    // BinderByte mengembalikan status 'DELIVERED' jika paket sudah sampai
    if (summaryStatus === 'delivered') {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ payment_status: 'Selesai' })
        .eq('id', orderDbId);

      if (updateErr) {
        return NextResponse.json({ error: 'Gagal update status di database: ' + updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ 
        isFinished: true, 
        message: 'Pesanan telah diterima oleh penerima.',
        status: 'DELIVERED' 
      });
    }

    return NextResponse.json({ 
      isFinished: false, 
      status: summaryStatus 
    });

  } catch (err) {
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
