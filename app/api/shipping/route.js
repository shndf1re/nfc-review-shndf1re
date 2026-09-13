import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { destinationPostalCode, destinationCityName, destinationDistrictName, qty = 1 } = await req.json();

    const cleanCity = String(destinationCityName || '').trim();
    const cleanDistrict = String(destinationDistrictName || '').trim();
    const postalCodeNum = parseInt(destinationPostalCode, 10);

    // 1. FREE ONGKIR LOKAL SAMARINDA
    const isSamarinda = cleanCity.toLowerCase().includes('samarinda') || 
                        cleanDistrict.toLowerCase().includes('samarinda') || 
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
      return NextResponse.json({ 
        error: 'BITESHIP_API_KEY belum terkonfigurasi di Vercel.' 
      }, { status: 500 });
    }

    const parsedQty = Math.max(1, parseInt(qty, 10) || 1);
    const weightGrams = Math.ceil(parsedQty / 50) * 1000;

    // STEP A: CARI ORIGIN AREA ID (SAMARINDA ULU) & DESTINATION AREA ID
    let originAreaId = 'IDNP19IDCD700IDD46977'; // Fallback Area ID Samarinda Ulu
    let destinationAreaId = null;

    // Search Area ID Asal (Samarinda Ulu)
    try {
      const originSearchRes = await fetch(`https://api.biteship.com/v1/maps/areas?countries=ID&input=Samarinda%20Ulu`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const originSearchData = await originSearchRes.json();
      if (originSearchData.areas && originSearchData.areas.length > 0) {
        originAreaId = originSearchData.areas[0].id;
      }
    } catch (e) {
      console.error('Failed fetch origin area id', e);
    }

    // Search Area ID Tujuan (Misal: Umbulharjo Kota Yogyakarta)
    const searchQuery = `${cleanDistrict} ${cleanCity}`;
    try {
      const destSearchRes = await fetch(`https://api.biteship.com/v1/maps/areas?countries=ID&input=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const destSearchData = await destSearchRes.json();
      if (destSearchData.areas && destSearchData.areas.length > 0) {
        destinationAreaId = destSearchData.areas[0].id;
      }
    } catch (e) {
      console.error('Failed fetch dest area id', e);
    }

    // STEP B: BUAT PAYLOAD CEK TARIF BITESHIP
    const payload = {
      couriers: 'jne,jnt,sicepat,pos',
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
      payload.origin_area_id = originAreaId;
      payload.destination_area_id = destinationAreaId;
    } else if (postalCodeNum) {
      payload.origin_postal_code = 75125;
      payload.destination_postal_code = postalCodeNum;
    } else {
      return NextResponse.json({ 
        error: `Area tujuan (${cleanDistrict}, ${cleanCity}) tidak ditemukan di sistem Biteship.` 
      }, { status: 400 });
    }

    // STEP C: PANGGIL API RATES BITESHIP
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
        error: rateData.message || `API Biteship merespons tetapi tidak menemukan tarif untuk lokasi ini. Cek status kurir di Dashboard Biteship.` 
      }, { status: 400 });
    }

    // Format Opsi Kurir Murni Real-Time
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
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
