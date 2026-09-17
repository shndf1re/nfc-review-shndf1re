import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // 1. Ambil Signature dari header yang dikirim Tripay
    const tripaySignature = req.headers.get('x-callback-signature');
    const privateKey = process.env.TRIPAY_PRIVATE_KEY || '';

    // 2. Buat Signature pembanding untuk validasi keamanan
    const signature = crypto
      .createHmac('sha256', privateKey)
      .update(rawBody)
      .digest('hex');

    // 3. Validasi: Jika tidak cocok, berarti ini hacker palsu, tolak!
    if (signature !== tripaySignature) {
      return NextResponse.json({ success: false, message: 'Invalid Signature' }, { status: 403 });
    }

    // 4. Proses Notifikasi (Hanya pedulikan status PAID/Lunas)
    const { reference, merchant_ref, status } = body;

    if (status === 'PAID') {
      // Update status di Supabase menjadi Lunas berdasarkan ID order (merchant_ref)
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'Lunas' })
        .eq('order_id', merchant_ref);

      if (error) {
        console.error('Supabase Update Error:', error);
        return NextResponse.json({ success: false, message: 'Database Error' }, { status: 500 });
      }
    }

    // 5. Beri tahu Tripay bahwa pesan sudah diterima dengan baik
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Callback Error:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
