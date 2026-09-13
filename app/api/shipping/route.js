import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { destinationPostalCode, destinationCityName, destinationDistrictName, qty = 1 } = await req.json();

    const cleanCity = String(destinationCityName || '').trim().toLowerCase();
    const cleanDistrict = String(destinationDistrictName || '').trim().toLowerCase();
    const postalCodeNum = parseInt(destinationPostalCode, 10);

    // 1. GRATIS ONGKIR LOKAL SAMARINDA
    const isSamarinda = cleanCity.includes('samarinda') || 
                        cleanDistrict.includes('samarinda') || 
                        (postalCodeNum >= 75000 && postalCodeNum <= 75258);

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

    const apiKey = process.env.BITESHIP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key Biteship belum dipasang.' }, { status: 500 });
    }

    const parsedQty = Math.max(1, parseInt(qty, 10) || 1);
    
    // RUMUS BERAT: Setiap kelipatan 20 pcs = 1 kg (1.000 gram)
    // 1 - 20 pcs = 1.000g (1 kg)
    // 21 - 40 pcs = 2.000g (2 kg)
    const weightGrams = Math.ceil(parsedQty / 20) * 1000;

    // PAYLOAD BITESHIP: quantity di-set 1 agar Biteship tidak mengalikan ongkir dengan pcs
    const payload = {
      origin_postal_code: 75125, // Samarinda Ulu
      destination_postal_code: postalCodeNum,
      couriers: 'jne,jnt,sicepat',
      items: [
        {
          name: 'Paket Papan Akrilik NFC Google Review',
          value: Number(60000 * parsedQty),
          weight: Number(weightGrams),
          quantity: 1, // Di-set 1 paket gabungan
        },
      ],
    };

    // REQUEST KE API RATES BITESHIP
    const rateRes = await fetch('https://api.biteship.com/v1/rates/couriers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rateData = await rateRes.json();

    if (!rateRes.ok || !rateData.pricing || rateData.pricing.length === 0) {
      const errorMsg = rateData.error || rateData.message || 'Rute pengiriman belum didukung oleh kurir.';
      return NextResponse.json({ error: `Biteship: ${errorMsg}` }, { status: 400 });
    }

    // FILTER MEMBUANG TRUCKING / KARGO
    const shippingResults = rateData.pricing
      .filter((item) => {
        const serviceName = String(item.courier_service_name || '').toLowerCase();
        const serviceCode = String(item.courier_service_code || '').toLowerCase();
        return !serviceName.includes('trucking') && !serviceCode.includes('jtr') && !serviceName.includes('cargo');
      })
      .map((item) => ({
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

  } catch (err) {
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
