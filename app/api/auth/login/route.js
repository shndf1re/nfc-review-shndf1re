import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { comparePin } from '@/lib/auth-crypto';
import { signAdminToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/jwt';

// SERVICE ROLE jika tersedia, fallback ke ANON. Service role tidak terkena RLS,
// sehingga aman untuk query tabel admin_users yang kita lock dari client.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi.' }, { status: 400 });
    }

    const uname = String(username).trim();
    const pass = String(password).trim();

    // Query admin_users (service role bypass RLS)
    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, name, username, password, pin, role, permissions')
      .eq('username', uname)
      .limit(1);

    if (error) {
      console.error('[auth/login] db error:', error);
      return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
    }

    const user = users && users[0];
    if (!user) {
      return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });
    }

    // Verifikasi password ATAU PIN (dengan fallback plaintext utk backward-compat)
    const okPassword = await comparePin(pass, user.password || '');
    const okPin = await comparePin(pass, user.pin || '');

    if (!okPassword && !okPin) {
      return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });
    }

    // Buat JWT (async karena pakai jose)
    const token = await signAdminToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role || 'staff',
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role || 'staff',
        permissions: user.permissions || {},
      },
    });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (err) {
    console.error('[auth/login] exception:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
