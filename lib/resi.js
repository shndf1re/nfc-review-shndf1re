// Lacak resi via BinderByte (server-only). Normalisasi respons -> { summary, detail, history }
export function normalizeCourier(name) {
  const c = String(name || '').toLowerCase();
  if (c.includes('j&t') || c.includes('jnt') || c.includes('j & t')) return 'jnt';
  if (c.includes('sicepat')) return 'sicepat';
  if (c.includes('anteraja')) return 'anteraja';
  if (c.includes('ninja')) return 'ninja';
  if (c.includes('tiki')) return 'tiki';
  if (c.includes('pos')) return 'pos';
  if (c.includes('lion')) return 'lion';
  if (c.includes('id express') || c.includes('idexpress') || c === 'ide') return 'ide';
  if (c.includes('spx') || c.includes('shopee')) return 'spx';
  if (c.includes('wahana')) return 'wahana';
  if (c.includes('sap')) return 'sap';
  if (c.includes('jne')) return 'jne';
  return c.replace(/[^a-z]/g, '') || 'jne';
}

export async function trackResi(resi, courierName) {
  const apiKey = process.env.BINDERBYTE_API_KEY || '';
  if (!apiKey) return { ok: false, code: 'NO_KEY', message: 'Fitur lacak resi belum aktif (BINDERBYTE_API_KEY belum dipasang).' };
  const awb = String(resi || '').trim();
  if (!awb) return { ok: false, code: 'BAD_INPUT', message: 'Nomor resi kosong.' };
  const courier = normalizeCourier(courierName);
  try {
    const res = await fetch(`https://api.binderbyte.com/v1/track?api_key=${encodeURIComponent(apiKey)}&courier=${courier}&awb=${encodeURIComponent(awb)}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== 200 || !json.data) {
      return { ok: false, code: 'NOT_FOUND', courier, message: json.message || 'Resi belum terdaftar atau masih diproses kurir. Coba lagi beberapa jam lagi.' };
    }
    const d = json.data;
    const history = (d.history || []).map((h) => ({ date: h.date, desc: h.desc, location: h.location || '' }));
    return {
      ok: true,
      courier,
      summary: {
        awb: d.summary?.awb || awb,
        courier: d.summary?.courier || courier.toUpperCase(),
        service: d.summary?.service || '',
        status: d.summary?.status || '',
        date: d.summary?.date || '',
        desc: d.summary?.desc || '',
      },
      detail: { origin: d.detail?.origin || '', destination: d.detail?.destination || '', shipper: d.detail?.shipper || '', receiver: d.detail?.receiver || '' },
      history,
      delivered: String(d.summary?.status || '').toLowerCase() === 'delivered',
    };
  } catch (e) {
    return { ok: false, code: 'NETWORK', courier, message: 'Gagal menghubungi layanan lacak resi.' };
  }
}
