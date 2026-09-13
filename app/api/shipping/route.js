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
    
    // PERBAIKAN RUMUS BERAT: 1 Pcs Akrilik = ~200 gram.
    // Jika order 1-5 Pcs, total berat di bawah 1.000 gram tetap dihitung 1 kg.
    // Ongkir Samarinda -> Balikpapan normal (~Rp 12.000 - Rp 15.000)
    const weightGrams = Math.max(1000, Math.ceil((parsedQty * 200) / 1000) * 1000);

    // 2. PAYLOAD STABIL (MURNI KODE POS)
    const payload = {
      origin_postal_code: 75125, // Kode Pos Samarinda Ulu
      destination_postal_code: postalCodeNum,
      couriers: 'jne,jnt,sicepat',
      items: [
        {
          name: 'Papan Akrilik NFC Google Review',
          value: 60000 * parsedQty,
          weight: weightGrams,
          quantity: parsedQty,
        },
      ],
    };

    // 3. REQUEST KE API RATES BITESHIP
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

    // 4. FORMAT HASIL & FILTER MEMBUANG JNE TRUCKING / KARGO
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
