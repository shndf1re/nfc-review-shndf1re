// Helper server-side untuk alur aktivasi papan (/setup/[id])
// PIN dicek di server (service role), tidak pernah dikirim ke browser pelanggan.
import { createClient } from '@supabase/supabase-js';

export const DEFAULT_PIN = '000000';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Sama dengan allowlist di middleware.js (redirect /r/:id hanya ke host ini)
const ALLOWED_REVIEW_HOSTS = new Set([
  'search.google.com', 'www.google.com', 'google.com', 'g.page',
  'maps.app.goo.gl', 'maps.google.com', 'goo.gl',
]);

export function formatReviewUrl(url) {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) return '';
  if (cleanUrl.startsWith('ChIJ') && !cleanUrl.includes(' ')) return `https://search.google.com/local/writereview?placeid=${cleanUrl}`;
  const match = cleanUrl.match(/placeid=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return `https://search.google.com/local/writereview?placeid=${match[1]}`;
  return cleanUrl;
}

export function isAllowedReviewUrl(url) {
  try {
    const u = new URL(url);
    return (u.protocol === 'https:' || u.protocol === 'http:') && ALLOWED_REVIEW_HOSTS.has(u.hostname.toLowerCase());
  } catch (e) {
    return false;
  }
}

export function validateNewPin(pin) {
  const p = String(pin || '').trim();
  if (!/^\d{6}$/.test(p)) return 'PIN baru harus 6 digit angka.';
  if (p === DEFAULT_PIN) return 'PIN baru tidak boleh 000000.';
  if (/^(\d)\1{5}$/.test(p)) return 'PIN baru terlalu mudah ditebak (angka sama semua).';
  if ('0123456789'.includes(p) || '9876543210'.includes(p)) return 'PIN baru terlalu mudah ditebak (angka berurutan).';
  return null;
}

export async function getDevice(id) {
  const { data, error } = await supabaseAdmin
    .from('devices')
    .select('id, pin, is_active, label_name, target_url')
    .eq('id', String(id || '').trim())
    .maybeSingle();
  return { data, error };
}

export const publicDevice = (d) => (d ? { id: d.id, is_active: Boolean(d.is_active), label_name: d.label_name || null, target_url: d.target_url || null } : null);

// Kartu belum aktif: terima PIN default 000000 ATAU PIN lama (pembeli lama yg sudah dapat PIN via WA).
// Kartu aktif: wajib PIN milik pelanggan.
export function checkPin(device, pin) {
  const input = String(pin || '').trim();
  const current = String(device?.pin || '').trim();
  if (!input) return false;
  if (!device?.is_active && input === DEFAULT_PIN) return true;
  return input === current;
}
