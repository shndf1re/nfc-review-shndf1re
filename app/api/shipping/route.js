import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { destinationCityName, weightGrams = 500 } = await req.json();

    const cleanCity = String(destinationCityName || '').trim().toLowerCase();

    // 1. Jika alamat tujuan adalah SAMARINDA, otomatis GRATIS ONGKIR (Rp 0)
    if (cleanCity.includes('samarinda')) {
      return NextResponse.json({
        success: true,
        isFreeShipping: true,
        results: [
          {
            courierCode: 'lokal',
            courierName: 'Kurir Lokal Samarinda',
            service: 'FREE',
            description: 'Gratis Ongkir Khusus Samarinda',
            cost: 0,
            etd: '1 Hari',
          },
        ],
      });
    }

    // 2. Jika Luar Samarinda, cari ID Kota via API RajaOngkir
    const apiKey = process.env.RAJAONGKIR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'RAJAONGKIR_API_KEY belum diset di Vercel.' }, { status: 500 });
    }

    // Ambil daftar kota dari RajaOngkir Starter
    const citiesRes = await fetch('https://api.rajaongkir.com/starter/city', {
      method: 'GET',
      headers: { key: apiKey },
    });
    const citiesData = await citiesRes.json();

    if (!citiesRes.ok || !citiesData.rajaongkir?.results) {
      return NextResponse.json({ error: 'Gagal mengambil data kota dari RajaOngkir.' }, { status: 500 });
    }

    // Match nama kota yang diketik pembeli
    const matchedCity = citiesData.rajaongkir.results.find((c) =>
      cleanCity.includes(c.city_name.toLowerCase()) || c.city_name.toLowerCase().includes(cleanCity)
    );

    if (!matchedCity) {
      return NextResponse.json(
        { error: `Kota "${destinationCityName}" tidak ditemukan. Pastikan ketik nama Kota/Kabupaten yang valid.` },
        { status: 404 }
      );
    }

    // 3. Hitung Ongkir Asli dari Kota Samarinda (ID: 387) ke Kota Tujuan
    const ORIGIN_CITY_SAMARINDA = 387; // ID Kota Samarinda di RajaOngkir
    const courierOptions = ['jne', 'pos', 'tiki'];
    let shippingResults = [];

    for (const courier of courierOptions) {
      const costRes = await fetch('https://api.rajaongkir.com/starter/cost', {
        method: 'POST',
        headers: {
          key: apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          origin: ORIGIN_CITY_SAMARINDA,
          destination: matchedCity.city_id,
          weight: weightGrams,
          courier: courier,
        }),
      });

      const costData = await costRes.json();
      if (costRes.ok && costData.rajaongkir?.results?.[0]?.costs) {
        const courierName = costData.rajaongkir.results[0].name;
        const services = costData.rajaongkir.results[0].costs;

        services.forEach((srv) => {
          shippingResults.push({
            courierCode: courier.toUpperCase(),
            courierName: `${courierName} (${srv.service})`,
            service: srv.service,
            description: srv.description,
            cost: srv.cost[0].value,
            etd: srv.cost[0].etd ? `${srv.cost[0].etd} Hari` : '-',
          });
        });
      }
    }

    return NextResponse.json({
      success: true,
      isFreeShipping: false,
      matchedCityName: `${matchedCity.type} ${matchedCity.city_name}, ${matchedCity.province}`,
      results: shippingResults,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
