import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req) {
  try {
    const { phone, orderId } = await req.json();

    if (!phone && !orderId) {
      return NextResponse.json(
        { success: false, error: 'Masukkan Nomor WA atau Order ID terlebih dahulu.' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    // 1. Filter jika mencantumkan Order ID spesifik
    if (orderId && orderId.trim() !== '') {
      query = query.eq('order_id', orderId.trim());
    } 
    // 2. Filter berdasarkan Nomor WhatsApp (mencakup pencarian fleksibel)
    else if (phone && phone.trim() !== '') {
      const cleanPhone = phone.trim().replace(/\D/g, '');
      
      // Mengantisipasi format nomor HP (08xx atau 628xx)
      let phoneVariants = [cleanPhone];
      if (cleanPhone.startsWith('0')) {
        phoneVariants.push('62' + cleanPhone.slice(1));
      } else if (cleanPhone.startsWith('62')) {
        phoneVariants.push('0' + cleanPhone.slice(2));
      }

      query = query.in('customer_phone', phoneVariants);
    }

    const { data: ordersData, error: dbErr } = await query;

    if (dbErr) {
      console.error('Database Track Query Error:', dbErr);
      return NextResponse.json(
        { success: false, error: 'Terjadi kesalahan saat mengambil data pesanan.' },
        { status: 500 }
      );
    }

    if (!ordersData || ordersData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan dengan data tersebut.' },
        { status: 444 }
      );
    }

    return NextResponse.json({
      success: true,
      orders: ordersData
    });

  } catch (err) {
    console.error('Track API Error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error: ' + err.message },
      { status: 500 }
    );
  }
}
