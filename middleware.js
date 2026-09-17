import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function middleware(req) {
  const url = req.nextUrl;

  // Menangani link kartu NFC pada path /r/[id] atau /go/[id]
  if (url.pathname.startsWith('/r/')) {
    const cardId = url.pathname.split('/')[2];

    if (cardId) {
      const { data } = await supabase
        .from('devices')
        .select('target_url, is_active')
        .eq('id', cardId)
        .maybeSingle();

      // Jika kartu sudah diaktifkan dan ada link Google Review, alihkan seratus persen instan
      if (data?.is_active && data?.target_url) {
        return NextResponse.redirect(data.target_url);
      }

      // Jika kartu belum aktif, alihkan langsung ke halaman setup
      return NextResponse.redirect(new URL(`/setup/${cardId}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/r/:id*',
};
