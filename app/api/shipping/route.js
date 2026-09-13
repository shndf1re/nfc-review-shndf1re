import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { destinationPostalCode, destinationCityName, destinationDistrictName, qty = 1 } = await req.json();

    const cleanCity = String(destinationCityName || '').trim().toLowerCase();
    const cleanDistrict = String(destinationDistrictName || '').trim().toLowerCase();
    const postalCodeNum = parseInt(destinationPostalCode, 10);

    // 1. GRATIS ONGKIR LOKAL SAMARINDA
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

    const apiKey = process.env.BITESHIP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'BITESHIP_API_KEY belum diset di Vercel.' 
      }, { status: 500 });
    }

    // Hitung berat (1-50 pcs = 1000g / 1 kg)
    const parsedQty = Math.max(1, parseInt(qty, 10) || 1);
    const weightGrams = Math.ceil(parsedQty / 50) * 1000;

    // STEP A: CARI MAPS AREA ID DARI BITESHIP DULU (AGAR ACCURATE 100%)
    const searchTerm = destinationDistrictName || destinationCityName;
    const areaRes = await fetch(`https://api.biteship.com/v1/maps/areas?countries=ID&input=${encodeURIComponent(searchTerm)}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const areaData = await areaRes.json();

    let destinationAreaId = null;
    if (areaData.areas && areaData.areas.length > 0) {
      destinationAreaId = areaData.areas[0].id;
    }

    // STEP B: PANGGIL API COURIER RATES BITESHIP DENGAN AREA ID / KODE POS
    const payload = {
      origin_postal_code: 75125, // Samarinda Ulu
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

    if (destinationAreaId) {
      payload.destination_area_id = destinationAreaId;
    } else if (postalCodeNum) {
      payload.destination_postal_code = postalCodeNum;
    } else {
      return NextResponse.json({ error: 'Area tujuan tidak ditemukan di sistem Biteship.' }, { status: 400 });
    }

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
      return NextResponse.json({ 
        error: rateData.message || `Tidak ada layanan kurir real-time dari Biteship yang menjangkau lokasi ini.` 
      }, { status: 400 });
    }

    // Format Opsi Murni dari Biteship
    const shippingResults = rateData.pricing.map((item) => ({
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
    return NextResponse.json({ error: 'Gagal memanggil API Biteship: ' + err.message }, { status: 500 });
  }
}
