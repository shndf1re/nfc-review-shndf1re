import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken, COOKIE_NAME } from '@/lib/jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Daftar hostname Google Review yang diizinkan untuk redirect dari /r/:id (mencegah open redirect)
const ALLOWED_REDIRECT_HOSTS = new Set([
  'search.google.com',
  'www.google.com',
  'google.com',
  'g.page',
  'maps.app.goo.gl',
  'maps.google.com',
  'goo.gl',
]);

function isSafeRedirect(url) {
  try {
    const u = new URL(url);
    return ALLOWED_REDIRECT_HOSTS.has(u.hostname.toLowerCase());
  } catch (e) {
    return false;
  }
}

export async function middleware(req) {
  const url = req.nextUrl;
  const path = url.pathname;

  // ===== 1. Proteksi /admin dan /admin/* (KECUALI halaman login utama /admin) =====
  // Semua subpath admin wajib JWT valid. Halaman /admin (login) tetap boleh diakses.
  if (path.startsWith('/admin/')) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const user = await verifyAdminToken(token);
    if (!user) {
      const loginUrl = new URL('/admin', req.url);
      loginUrl.searchParams.set('reason', 'login_required');
      return NextResponse.redirect(loginUrl);
    }
    // Role check: /admin/users hanya super_admin
    if (path.startsWith('/admin/users') && user.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/admin?reason=forbidden', req.url));
    }
  }

  // ===== 2. Link kartu NFC /r/:id (dengan validasi hostname untuk cegah open redirect) =====
  if (path.startsWith('/r/')) {
    const cardId = path.split('/')[2];
    if (cardId) {
      const { data } = await supabase
        .from('devices')
        .select('target_url, is_active')
        .eq('id', cardId)
        .maybeSingle();

      if (data?.is_active && data?.target_url && isSafeRedirect(data.target_url)) {
        return NextResponse.redirect(data.target_url);
      }
      return NextResponse.redirect(new URL(`/setup/${cardId}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/r/:id*'],
};
