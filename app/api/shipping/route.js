import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { destinationPostalCode, destinationCityName, weightGrams = 500 } = await req.json();

    const cleanCity = String(destinationCityName || '').trim().toLowerCase();
    const postalCodeNum = parseInt(destinationPostalCode, 10);

    // 1. KOTA SAMARINDA = OTOMATIS FREE ONGKIR
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

    // 2. CEK API KEY BITESHIP
    const apiKey = process.env.BITESHIP_API_KEY;
    const ORIGIN_POSTAL_CODE = 75125;
    const targetPostal = postalCodeNum && !isNaN(postalCodeNum) ? postalCodeNum : 40111;

    if (apiKey) {
      try {
        const response = await fetch('https://api.biteship.com/v1/rates/couriers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin_postal_code: ORIGIN_POSTAL_CODE,
            destination_postal_code: targetPostal,
            couriers: 'jne,sicepat,pos,anteraja',
            items: [
              {
                name: 'Papan Akrilik NFC Google Review',
                description: 'Papan Akrilik Review',
                value: 60000,
                weight: weightGrams,
                quantity: 1,
              },
            ],
          }),
        });

        const data = await response.json();

        if (response.ok && data.pricing && data.pricing.length > 0) {
          const shippingResults = data.pricing.map((item) => ({
            courierCode: String(item.courier_code || '').toUpperCase(),
            courierName: `${item.courier_name} (${item.courier_service_name || item.service_type})`,
            service: item.courier_service_code || 'REG',
            cost: item.price,
            etd: item.shipment_duration_range ? `${item.shipment_duration_range} ${item.shipment_duration_unit || 'Hari'}` : '2-3 Hari',
          }));

          return NextResponse.json({
            success: true,
            isFreeShipping: false,
            results: shippingResults,
          });
        }
      } catch (e) {
        console.error('Biteship Fetch Failed, fallback to standard rates', e);
      }
    }

    // 3. FALLBACK STANDAR TARIF EKSPEDISI (Jika API Key belum diset / Biteship limit)
    const fallbackResults = [
      {
        courierCode: 'JNE',
        courierName: 'JNE (Reguler)',
        service: 'REG',
        cost: 24000,
        etd: '2-3 Hari',
      },
      {
        courierCode: 'JNT',
        courierName: 'J&T (EZ)',
        service: 'EZ',
        cost: 26000,
        etd: '2-3 Hari',
      },
      {
        courierCode: 'SICEPAT',
        courierName: 'SiCepat (GOKIL/REG)',
        service: 'REG',
        cost: 25000,
        etd: '2-3 Hari',
      },
    ];

    return NextResponse.json({
      success: true,
      isFreeShipping: false,
      results: fallbackResults,
    });

  } catch (err) {
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
