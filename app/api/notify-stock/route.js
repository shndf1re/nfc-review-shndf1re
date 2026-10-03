import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// NOMOR HP ADMIN PENERIMA NOTIFIKASI
const ADMIN_PHONE = '6285183144404'; 
const LOW_STOCK_THRESHOLD = 5;

export async function POST(request) {
  try {
    const { itemName } = await request.json();
    const targetItem = itemName || 'Papan Akrilik';

    // 1. Cek stok terkini dari database
    const { data, error } = await supabase
      .from('inventory')
      .select('stock_quantity')
      .eq('item_name', targetItem)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ success: false, message: 'Item tidak ditemukan.' }, { status: 400 });
    }

    const currentStock = data.stock_quantity;

    // 2. Jika stok <= THRESHOLD (5 pcs), buatkan link WhatsApp Alert
    if (currentStock <= LOW_STOCK_THRESHOLD) {
      const message = `⚠️ *PERINGATAN STOK TIPIS!*\n\nStok item *${targetItem}* saat ini tersisa *${currentStock} pcs* (Batas Minimum: ${LOW_STOCK_THRESHOLD} pcs).\n\nMohon segera lakukan *restock* atau pemesanan ulang ke supplier.`;
      const waUrl = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(message)}`;

      return NextResponse.json({
        isLowStock: true,
        currentStock,
        waUrl,
        message: `Stok menipis (${currentStock} pcs)!`
      });
    }

    return NextResponse.json({ isLowStock: false, currentStock });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
