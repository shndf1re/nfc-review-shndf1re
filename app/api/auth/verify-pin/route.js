import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { comparePin } from '@/lib/auth-crypto';
import { getAdminFromCookie } from '@/lib/auth-server';

// Dipakai untuk otorisasi aksi sensitif (hapus kartu, bulk generate, dll).
// Hanya menerima request dari user yang sudah login (JWT valid).

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(req) {
  const admin = await getAdminFromCookie();
  if (!admin) return NextResponse.json({ valid: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { pin, requireSuperAdmin } = await req.json();
    if (!pin) return NextResponse.json({ valid: false, error: 'PIN wajib diisi.' }, { status: 400 });

    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, username, role, password, pin');

    if (error) return NextResponse.json({ valid: false, error: 'DB error' }, { status: 500 });

    const cleanPin = String(pin).trim();
    let matched = null;
    for (const u of users || []) {
      if (await comparePin(cleanPin, u.pin || '')) { matched = u; break; }
      if (await comparePin(cleanPin, u.password || '')) { matched = u; break; }
    }

    if (!matched) return NextResponse.json({ valid: false, error: 'PIN salah.' }, { status: 401 });
    if (requireSuperAdmin && matched.role !== 'super_admin') {
      return NextResponse.json({ valid: false, error: 'Harus Super Admin.' }, { status: 403 });
    }

    return NextResponse.json({ valid: true, role: matched.role, username: matched.username });
  } catch (err) {
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 });
  }
}
