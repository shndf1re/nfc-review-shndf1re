import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { destinationPostalCode, destinationCityName, destinationDistrictName, qty = 1 } = await req.json();

    const cleanCity = String(destinationCityName || '').trim().toLowerCase();
    const cleanDistrict = String(destinationDistrictName || '').trim().toLowerCase();
    const postalCodeNum = parseInt(destinationPostalCode, 10) || 75125;

    // 1. LOGIKA FREE ONGKIR SAMARINDA
    const isSamarinda = cleanCity.includes('samarinda') || cleanDistrict.includes('samarinda') || (postalCodeNum >= 75000 && postalCodeNum <= 75258);

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

    // 2. LOGIKA BERAT (1-50 pcs = 1000g / 1 kg)
    const parsedQty = Math.max(1, parseInt(qty, 10) || 1);
    const weightGrams = Math.ceil(parsedQty / 50) * 1000;

    const apiKey = process.env.BITESHIP_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'BITESHIP_API_KEY belum terkonfigurasi di Vercel.' 
      }, { status: 500 });
    }

    // 3. PANGGIL BITESHIP WITH COORDINATES & POSTAL CODE
    try {
      const response = await fetch('https://api.biteship.com/v1/rates/couriers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin_latitude: -0.4855,
          origin_longitude: 117.1462,
          origin_postal_code: 75125,
          destination_postal_code: postalCodeNum,
          couriers: 'jne,jnt,sicepat',
          items: [
            {
              name: 'Papan Akrilik NFC Google Review',
              description: 'Akrilik Review',
              value: 60000 * parsedQty,
              weight: weightGrams,
              quantity: parsedQty,
            },
          ],
        }),
      });

      const data = await response.json();

      if (response.ok && data.pricing && data.pricing.length > 0) {
        const shippingResults = data.pricing.map((item) => ({
          courierCode: String(item.courier_code || '').toUpperCase(),
          courierName: `${item.courier_name} (${item.courier_service_name || item.service_type || 'Reguler'})`,
          service: item.courier_service_code || 'REG',
          cost: item.price,
          etd: item.shipment_duration_range ? `${item.shipment_duration_range} ${item.shipment_duration_unit || 'Hari'}` : '2-3 Hari',
        }));

        return NextResponse.json({
          success: true,
          isFreeShipping: false,
          calculatedWeightKg: weightGrams / 1000,
          results: shippingResults,
        });
      }
    } catch (errApi) {
      console.error('Biteship Fetch Exception:', errApi);
    }

    // 4. FALLBACK KHUSUS KURIR AKTIF KAMU (JNE / J&T / SiCepat)
    // Berjalan jika Sandbox Biteship tidak memberikan tarif antarisland
    const activeCourierRates = [
      {
        courierCode: 'JNE',
        courierName: 'JNE (Reguler)',
        service: 'REG',
        cost: 38000 * (weightGrams / 1000),
        etd: '2-3 Hari',
      },
      {
        courierCode: 'JNT',
        courierName: 'J&T (EZ)',
        service: 'EZ',
        cost: 40000 * (weightGrams / 1000),
        etd: '2-3 Hari',
      },
      {
        courierCode: 'SICEPAT',
        courierName: 'SiCepat (REG)',
        service: 'REG',
        cost: 37000 * (weightGrams / 1000),
        etd: '2-3 Hari',
      },
    ];

    return NextResponse.json({
      success: true,
      isFreeShipping: false,
      calculatedWeightKg: weightGrams / 1000,
      results: activeCourierRates,
    });

  } catch (err) {
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
