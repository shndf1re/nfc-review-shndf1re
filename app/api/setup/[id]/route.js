import { NextResponse } from 'next/server';
import { getDevice, publicDevice } from '@/lib/setup-server';

export const dynamic = 'force-dynamic';

// GET /api/setup/:id -> info publik kartu (TANPA PIN)
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { data, error } = await getDevice(id);
    if (error) return NextResponse.json({ error: 'Gagal memuat data kartu.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'ID Kartu tidak ditemukan di sistem.' }, { status: 404 });
    return NextResponse.json({ device: publicDevice(data) });
  } catch (e) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
