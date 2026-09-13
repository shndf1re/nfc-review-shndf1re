import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { destinationPostalCode, destinationCityName, qty = 1 } = await req.json();

    const cleanCity = String(destinationCityName || '').trim().toLowerCase();
    const postalCodeNum = parseInt(destinationPostalCode, 10);

    // 1. LOGIKA LOKAL SAMARINDA (Gratis Ongkir)
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

    // 2. HITUNG BERAT (1-50 Pcs = 1000g / 1 kg)
    const parsedQty = Math.max(1, parseInt(qty, 10) || 1);
    const weightGrams = Math.ceil(parsedQty / 50) * 1000;
    const targetPostal = postalCodeNum && !isNaN(postalCodeNum) ? postalCodeNum : 40111;

    // 3. PANGGIL API BITESHIP REAL-TIME
    const apiKey = process.env.BITESHIP_API_KEY;

    if (apiKey) {
      try {
        const response = await fetch('https://api.biteship.com/v1/rates/couriers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin_postal_code: 75125,
            destination_postal_code: targetPostal,
            couriers: 'jne,sicepat,pos',
            items: [
              {
                name: 'Papan Akrilik NFC Google Review',
                description: 'Papan Akrilik Review',
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
      } catch (errFetch) {
        console.error('Biteship Fetch Error:', errFetch);
      }
    }

    // 4. FALLBACK TARIF STANDAR (Mencegah pembeli gagal checkout jika API limit/error)
    const fallbackResults = [
      {
        courierCode: 'JNE',
        courierName: 'JNE (Reguler)',
        service: 'REG',
        cost: 38000,
        etd: '2-3 Hari',
      },
      {
        courierCode: 'SICEPAT',
        courierName: 'SiCepat (REG)',
        service: 'REG',
        cost: 36000,
        etd: '2-3 Hari',
      },
      {
        courierCode: 'POS',
        courierName: 'POS Indonesia (Kilat Khusus)',
        service: 'POS',
        cost: 35000,
        etd: '3-4 Hari',
      },
    ];

    return NextResponse.json({
      success: true,
      isFreeShipping: false,
      calculatedWeightKg: weightGrams / 1000,
      results: fallbackResults,
    });

  } catch (err) {
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
