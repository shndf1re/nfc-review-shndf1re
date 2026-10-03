import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_NAME, verifyAdminToken } from './jwt';

/**
 * Dipakai di API Route Handler untuk ambil admin yang sedang login.
 * Return null jika tidak login / token invalid / expired.
 */
export async function getAdminFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifyAdminToken(token);
  return payload; // { id, username, role, name } atau null
}

/**
 * Guard untuk API Route Handler. Pakai seperti:
 *   const guard = await requireAdmin(req, { role: 'super_admin' });
 *   if (guard.error) return guard.error;
 *   const user = guard.user;
 */
export async function requireAdmin(req, { role } = {}) {
  const user = await getAdminFromCookie();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (role && user.role !== role) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}
