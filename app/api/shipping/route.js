import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { destinationPostalCode, destinationCityName, destinationDistrictName, qty = 1 } = await req.json();

    const cleanCity = String(destinationCityName || '').trim().toLowerCase();
    const cleanDistrict = String(destinationDistrictName || '').trim().toLowerCase();
    const postalCodeNum = parseInt(destinationPostalCode, 10);

    // 1. CEK GRATIS ONGKIR SAMARINDA
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
        error: 'Sistem ongkir Biteship belum terhubung. Konfigurasi API Key di Vercel terlebih dahulu.' 
      }, { status: 500 });
    }

    if (!postalCodeNum || isNaN(postalCodeNum)) {
      return NextResponse.json({ error: 'Kode Pos tidak valid.' }, { status: 400 });
    }

    // 3. PANGGIL API BITESHIP SANGAT PRESISI (NO FALLBACK)
    const response = await fetch('https://api.biteship.com/v1/rates/couriers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin_postal_code: 75125, // Samarinda Ulu
        destination_postal_code: postalCodeNum,
        couriers: 'jne,sicepat,pos,anteraja',
        items: [
          {
            name: 'Papan Akrilik NFC Google Review',
            description: 'Produk Akrilik',
            value: 60000 * parsedQty,
            weight: weightGrams,
            quantity: parsedQty,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.pricing || data.pricing.length === 0) {
      return NextResponse.json({ 
        error: data.message || `Tarif pengiriman resmi dari Biteship tidak ditemukan untuk Kode Pos ${postalCodeNum}. Mohon periksa kembali alamat Anda.` 
      }, { status: 400 });
    }

    // Format Opsi Kurir Resmi Biteship
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

  } catch (err) {
    return NextResponse.json({ error: 'Gagal menghubungkan ke layanan kurir: ' + err.message }, { status: 500 });
  }
}
