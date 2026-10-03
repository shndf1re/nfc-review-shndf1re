import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPin } from '@/lib/auth-crypto';
import { getAdminFromCookie } from '@/lib/auth-server';

// Endpoint satu-kali untuk mem-bcrypt password & PIN plaintext yang ada di DB.
// Hanya bisa diakses oleh super_admin yang sudah login.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function GET(req) {
  // Alias untuk mobile user yang susah akses DevTools Console
  return POST(req);
}

export async function POST(req) {
  const admin = await getAdminFromCookie();
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden - super admin only' }, { status: 403 });
  }

  try {
    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, password, pin');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let migrated = 0;
    let skipped = 0;
    const results = [];

    for (const u of users || []) {
      const update = {};
      const isPasswordHashed = u.password && (u.password.startsWith('$2a$') || u.password.startsWith('$2b$'));
      const isPinHashed = u.pin && (u.pin.startsWith('$2a$') || u.pin.startsWith('$2b$'));

      if (u.password && !isPasswordHashed) {
        update.password = await hashPin(String(u.password).trim());
      }
      if (u.pin && !isPinHashed) {
        update.pin = await hashPin(String(u.pin).trim());
      }

      if (Object.keys(update).length > 0) {
        const { error: upErr } = await supabase.from('admin_users').update(update).eq('id', u.id);
        if (upErr) {
          results.push({ id: u.id, error: upErr.message });
        } else {
          migrated++;
          results.push({ id: u.id, migrated: Object.keys(update) });
        }
      } else {
        skipped++;
      }
    }

    return NextResponse.json({ success: true, migrated, skipped, total: users?.length || 0, results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
