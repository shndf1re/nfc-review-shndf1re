// JWT helper - menggunakan `jose` yang kompatibel dengan Edge Runtime
// (dipakai oleh middleware Next.js). jsonwebtoken tidak bisa jalan di Edge.
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION_PLEASE_USE_LONG_RANDOM_STRING';
const JWT_EXPIRES_IN = '12h';

export const COOKIE_NAME = 'nfc_admin_token';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 12 * 60 * 60, // 12 jam
};

const encodedSecret = () => new TextEncoder().encode(JWT_SECRET);

export async function signAdminToken(payload) {
  // payload: { id, username, role, name }
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(encodedSecret());
}

export async function verifyAdminToken(token) {
  try {
    if (!token) return null;
    const { payload } = await jwtVerify(token, encodedSecret(), { algorithms: ['HS256'] });
    return payload; // { id, username, role, name, iat, exp }
  } catch (err) {
    return null;
  }
}
