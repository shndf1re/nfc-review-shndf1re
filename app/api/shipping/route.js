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

    // 1. CEK KHUSUS LOKAL SAMARINDA BERDASARKAN KECAMATAN
    const isSamarinda = (destinationCityName || '').toLowerCase().includes('samarinda');

    if (isSamarinda) {
      const districtLower = (destinationDistrictName || '').toLowerCase();
      let localShippingCost = 0;
      let labelOngkir = 'Kurir Lokal Samarinda (Free Ongkir)';

      if (districtLower.includes('palaran')) {
        localShippingCost = 15000;
        labelOngkir = 'Kurir Lokal Samarinda (Palaran)';
      } else if (districtLower.includes('loa janan ilir')) {
        localShippingCost = 15000;
        labelOngkir = 'Kurir Lokal Samarinda (Loa Janan Ilir)';
      } else if (districtLower.includes('sambutan')) {
        localShippingCost = 15000;
        labelOngkir = 'Kurir Lokal Samarinda (Sambutan)';
      } else if (districtLower.includes('samarinda seberang')) {
        localShippingCost = 10000;
        labelOngkir = 'Kurir Lokal Samarinda (Samarinda Seberang)';
      }

      const isFree = localShippingCost === 0;

      return NextResponse.json({
        isFreeShipping: isFree,
        results: [
          {
            courierCode: 'lokal',
            courierName: labelOngkir,
            service: isFree ? 'FREE' : 'REGULER',
            cost: localShippingCost,
            etd: '1 Hari'
          }
        ]
      });
    }

    // 2. CEK ONGKIR EKSPEDISI DILUAR SAMARINDA VIA BITESHIP API
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

    // 3. FILTER & MAPPING NAMA PAKET RESMI EKSPEDISI (UNTUK DILUAR SAMARINDA)
    const filteredPricing = data.pricing.filter((item) => item.price <= 90000);
    filteredPricing.sort((a, b) => a.price - b.price);

    const results = filteredPricing.map((item) => {
      const code = (item.courier_code || '').toLowerCase();
      const serviceType = (item.service_type || '').toLowerCase();
      let officialServiceName = item.service_name || item.service_type;

      if (code.includes('jne')) {
        if (serviceType.includes('reg') || serviceType.includes('standard')) officialServiceName = 'REG';
        else if (serviceType.includes('yes')) officialServiceName = 'YES';
        else if (serviceType.includes('oke')) officialServiceName = 'OKE';
      } else if (code.includes('jnt') || code.includes('j&t')) {
        if (serviceType.includes('ez') || serviceType.includes('standard')) officialServiceName = 'EZ';
        else if (serviceType.includes('jemari')) officialServiceName = 'JEMARI';
      } else if (code.includes('sicepat')) {
        if (serviceType.includes('reg') || serviceType.includes('standard')) officialServiceName = 'REG';
        else if (serviceType.includes('best')) officialServiceName = 'BEST';
        else if (serviceType.includes('gokil')) officialServiceName = 'GOKIL';
      } else if (code.includes('pos')) {
        if (serviceType.includes('reg') || serviceType.includes('standard')) officialServiceName = 'Kilat Khusus';
      }

      const courierNameFormatted = `${item.courier_name} ${officialServiceName}`;

      return {
        courierCode: item.courier_code,
        courierName: courierNameFormatted,
        service: officialServiceName,
        cost: item.price,
        etd: item.shipment_duration_range ? `${item.shipment_duration_range} hari` : '2-4 hari'
      };
    });

    return NextResponse.json({
      isFreeShipping: false,
      results: results
    });

  } catch (err) {
    console.error('Shipping API Catch Error:', err);
    return NextResponse.json({ 
      error: 'Terjadi kesalahan server saat mengecek ongkir: ' + err.message 
    }, { status: 500 });
  }
}
