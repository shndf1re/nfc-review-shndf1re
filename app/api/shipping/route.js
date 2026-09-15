import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { destinationPostalCode, destinationCityName, destinationDistrictName, qty } = await req.json();

    const biteshipApiKey = process.env.BITESHIP_API_KEY || '';

    if (!biteshipApiKey) {
      return NextResponse.json({ 
        error: 'BITESHIP_API_KEY belum dikonfigurasi di environment variable (.env.local / Vercel).' 
      }, { status: 500 });
    }

    const totalWeight = Math.max(1, (parseInt(qty, 10) || 1) * 200); // 200 gr per pcs

    // 1. CEK KHUSUS LOKAL SAMARINDA (FREE ONGKIR)
    const isSamarinda = (destinationCityName || '').toLowerCase().includes('samarinda');

    if (isSamarinda) {
      return NextResponse.json({
        isFreeShipping: true,
        results: [
          {
            courierCode: 'lokal',
            courierName: 'Kurir Lokal Samarinda (Free Ongkir)',
            service: 'FREE',
            cost: 0,
            etd: '1 Hari'
          }
        ]
      });
    }

    // 2. CEK ONGKIR EKSPEDISI VIA BITESHIP API
    const response = await fetch('https://api.biteship.com/v1/rates/couriers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${biteshipApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        origin_postal_code: 75119, // Kode Pos Samarinda Ulu / Toko Utama
        destination_postal_code: parseInt(destinationPostalCode, 10) || 0,
        couriers: 'jne,jnt,pos,sicepat',
        items: [
          {
            name: 'Papan Akrilik NFC',
            value: 60000,
            quantity: parseInt(qty, 10) || 1,
            weight: totalWeight
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Biteship API Error Raw:', errorText);
      return NextResponse.json({ 
        error: 'Gagal menghubungi Biteship. Pastikan BITESHIP_API_KEY valid.' 
      }, { status: 400 });
    }

    const data = await response.json();

    if (!data.success || !data.pricing || data.pricing.length === 0) {
      return NextResponse.json({ 
        error: data.message || 'Tidak ada layanan kurir yang tersedia untuk kode pos ini.' 
      }, { status: 400 });
    }

    // 3. FILTER KURIR: Hapus ongkir mahal terpisah (> Rp 90.000) dan rapikan nama layanan
    const filteredPricing = data.pricing.filter((item) => {
      // Abaikan jika harga di atas Rp 90.000 (menghapus JNE YES / Instant yang terlampau mahal)
      if (item.price > 90000) return false;
      return true;
    });

    // Urutkan dari ongkir termurah ke termahal
    filteredPricing.sort((a, b) => a.price - b.price);

    // Format opsi kurir untuk dimunculkan di dropdown frontend
    const results = filteredPricing.map((item) => {
      let prettyName = item.courier_name;
      
      // Rapikan label di dropdown agar terlihat profesional
      if (item.service_type) {
        prettyName = `${item.courier_name} (${item.service_type.toUpperCase()})`;
      }

      return {
        courierCode: item.courier_code,
        courierName: prettyName,
        service: item.service_type,
        cost: item.price,
        etd: item.shipment_duration_range ? `${item.shipment_duration_range} hari` : '2-4 hari'
      };
    });

    return NextResponse.json({
      isFreeShipping: false,
      results: results.length > 0 ? results : data.pricing.slice(0, 3).map(item => ({
        courierCode: item.courier_code,
        courierName: `${item.courier_name} (${item.service_type})`,
        service: item.service_type,
        cost: item.price,
        etd: item.shipment_duration_range ? `${item.shipment_duration_range} hari` : '2-4 hari'
      }))
    });

  } catch (err) {
    console.error('Shipping API Catch Error:', err);
    return NextResponse.json({ 
      error: 'Terjadi kesalahan server saat mengecek ongkir: ' + err.message 
    }, { status: 500 });
  }
}
