import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { destinationPostalCode, destinationCityName, weightGrams = 500 } = await req.json();

    const cleanCity = String(destinationCityName || '').trim().toLowerCase();
    const postalCodeNum = parseInt(destinationPostalCode, 10);

    // 1. LOGIKA LOKAL SAMARINDA (Kodepos 75xxx atau nama Kota mengandung Samarinda)
    const isSamarinda = cleanCity.includes('samarinda') || (postalCodeNum >= 75000 && postalCodeNum <= 75258);

    if (isSamarinda) {
      return NextResponse.json({
        success: true,
        isFreeShipping: true,
        results: [
          {
            courierCode: 'LOKAL',
            courierName: 'Kurir Lokal Samarinda',
            service: 'FREE',
            cost: 0,
            etd: '1 Hari',
          },
        ],
      });
    }

    // 2. LOGIKA LUAR SAMARINDA (Panggil API Biteship)
    const apiKey = process.env.BITESHIP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'BITESHIP_API_KEY belum dikonfigurasi di Vercel.' }, { status: 500 });
    }

    if (!postalCodeNum || isNaN(postalCodeNum)) {
      return NextResponse.json({ error: 'Kode Pos wajib diisi angka 5 digit untuk cek tarif luar kota.' }, { status: 400 });
    }

    const ORIGIN_POSTAL_CODE = 75125; // Samarinda Ulu

    const response = await fetch('https://api.biteship.com/v1/rates/couriers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin_postal_code: ORIGIN_POSTAL_CODE,
        destination_postal_code: postalCodeNum,
        couriers: 'jne,jnt,sicepat,anteraja,pos',
        items: [
          {
            name: 'Papan Akrilik NFC Google Review',
            value: 60000,
            weight: weightGrams,
            quantity: 1,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.pricing) {
      return NextResponse.json({ error: data.message || 'Gagal menghitung tarif ongkir dari Biteship.' }, { status: 400 });
    }

    // Format hasil response Biteship untuk dropdown pilihan di frontend
    const shippingResults = data.pricing.map((item) => ({
      courierCode: item.courier_code.toUpperCase(),
      courierName: `${item.courier_name} (${item.courier_service_name})`,
      service: item.courier_service_code,
      cost: item.price,
      etd: item.shipment_duration_range ? `${item.shipment_duration_range} ${item.shipment_duration_unit}` : '-',
    }));

    return NextResponse.json({
      success: true,
      isFreeShipping: false,
      results: shippingResults,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
