'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Inter } from 'next/font/google';
import { SITE_CONFIG } from '../../lib/config';

const inter = Inter({ subsets: ['latin'] });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// DATA WILAYAH SAMPLE UTAMA (PROVINSI - KOTA - KECAMATAN - KODEPOS)
const PROVINCE_LIST = [
  { id: 'kaltim', name: 'Kalimantan Timur' },
  { id: 'jabar', name: 'Jawa Barat' },
  { id: 'dki', name: 'DKI Jakarta' },
  { id: 'jatim', name: 'Jawa Timur' },
  { id: 'jateng', name: 'Jawa Tengah' },
];

const CITY_MAP = {
  kaltim: [
    { id: 'samarinda', name: 'Kota Samarinda' },
    { id: 'balikpapan', name: 'Kota Balikpapan' },
    { id: 'kukar', name: 'Kab. Kutai Kartanegara' },
  ],
  jabar: [
    { id: 'bandung', name: 'Kota Bandung' },
    { id: 'bekasi', name: 'Kota Bekasi' },
    { id: 'bogor', name: 'Kota Bogor' },
  ],
  dki: [
    { id: 'jaksel', name: 'Jakarta Selatan' },
    { id: 'jaktim', name: 'Jakarta Timur' },
    { id: 'jakbar', name: 'Jakarta Barat' },
  ],
  jatim: [
    { id: 'surabaya', name: 'Kota Surabaya' },
    { id: 'malang', name: 'Kota Malang' },
  ],
  jateng: [
    { id: 'semarang', name: 'Kota Semarang' },
    { id: 'solo', name: 'Kota Surakarta (Solo)' },
  ],
};

const DISTRICT_MAP = {
  samarinda: [
    { name: 'Samarinda Ulu', postal: '75125' },
    { name: 'Samarinda Utara', postal: '75119' },
    { name: 'Sungai Kunjang', postal: '75126' },
    { name: 'Sambutan', postal: '75115' },
    { name: 'Palaran', postal: '75243' },
  ],
  balikpapan: [
    { name: 'Balikpapan Kota', postal: '76111' },
    { name: 'Balikpapan Selatan', postal: '76114' },
    { name: 'Balikpapan Utara', postal: '76125' },
  ],
  kukar: [
    { name: 'Tenggarong', postal: '75511' },
    { name: 'Loa Janan', postal: '75391' },
  ],
  bandung: [
    { name: 'Sumur Bandung', postal: '40111' },
    { name: 'Coblong', postal: '40132' },
    { name: 'Cicendo', postal: '40171' },
    { name: 'Bandung Wetan', postal: '40116' },
  ],
  jaksel: [
    { name: 'Kebayoran Baru', postal: '12110' },
    { name: 'Cilandak', postal: '12430' },
  ],
  surabaya: [
    { name: 'Tegalsari', postal: '60261' },
    { name: 'Gubeng', postal: '60281' },
  ],
};

export default function OrderPage() {
  const router = useRouter();

  const [activeOrder, setActiveOrder] = useState(null);
  const [checkingOrder, setCheckingOrder] = useState(true);

  // CONTROL STEP (1 = Data Diri, 2 = Alamat & Kurir)
  const [step, setStep] = useState(1);

  // STEP 1 STATE
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [orderQty, setOrderQty] = useState(1);

  // STEP 2 STATE (DROPDOWN WILAYAH)
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  // BITESHIP ONGKIR STATE
  const [isCheckingShipping, setIsCheckingShipping] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [shippingMessage, setShippingMessage] = useState('');

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [timeLeft, setTimeLeft] = useState((SITE_CONFIG.pricing?.timerMinutes || 15) * 60);

  const DISCOUNT_PRICE = SITE_CONFIG.pricing?.discountPrice || 60000;
  const PROMO_TAG = SITE_CONFIG.pricing?.promoTag || '🔥 PROMO SPESIAL 60% OFF';

  const shippingCost = selectedShipping ? selectedShipping.cost : 0;
  const totalItemsPrice = orderQty * DISCOUNT_PRICE;
  const grandTotal = totalItemsPrice + shippingCost;

  useEffect(() => {
    checkSavedOrder();
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const checkSavedOrder = async () => {
    try {
      setCheckingOrder(true);
      const savedOrderId = localStorage.getItem('active_nfc_order_id');
      if (savedOrderId) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('order_id', savedOrderId)
          .maybeSingle();

        if (data && data.payment_status === 'pending') {
          setActiveOrder(data);
        } else {
          localStorage.removeItem('active_nfc_order_id');
          setActiveOrder(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingOrder(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // HANDLER STEP 1 -> STEP 2
  const handleNextToStep2 = (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Nama Lengkap dan Nomor WhatsApp wajib diisi.');
      return;
    }
    setStep(2);
  };

  // HANDLER DROPDOWN PROVINSI & KOTA & KECAMATAN
  const handleProvinceChange = (e) => {
    const provId = e.target.value;
    setSelectedProvince(provId);
    setSelectedCity('');
    setSelectedDistrict('');
    setPostalCode('');
    setShippingOptions([]);
    setSelectedShipping(null);
    setShippingMessage('');
  };

  const handleCityChange = (e) => {
    const cityId = e.target.value;
    setSelectedCity(cityId);
    setSelectedDistrict('');
    setPostalCode('');
    setShippingOptions([]);
    setSelectedShipping(null);
    setShippingMessage('');
  };

  const handleDistrictChange = (e) => {
    const distName = e.target.value;
    setSelectedDistrict(distName);
    const distObj = (DISTRICT_MAP[selectedCity] || []).find((d) => d.name === distName);
    if (distObj) {
      setPostalCode(distObj.postal);
    }
    setShippingOptions([]);
    setSelectedShipping(null);
    setShippingMessage('');
  };

  // HANDLER CEK ONGKIR BITESHIP REAL-TIME
  const handleCheckShipping = async () => {
    if (!selectedCity || !selectedDistrict || !postalCode) {
      alert('Silakan pilih Kota, Kecamatan, dan Kode Pos terlebih dahulu.');
      return;
    }

    setIsCheckingShipping(true);
    setShippingMessage('');
    setShippingOptions([]);
    setSelectedShipping(null);

    const cityNameObj = (CITY_MAP[selectedProvince] || []).find((c) => c.id === selectedCity);
    const cityName = cityNameObj ? cityNameObj.name : selectedCity;

    try {
      const res = await fetch('/api/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationCityName: cityName,
          destinationDistrictName: selectedDistrict,
          destinationPostalCode: postalCode,
          qty: orderQty,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Gagal menghitung tarif ongkir.');

      if (data.isFreeShipping) {
        setShippingMessage('🎉 Selamat! Alamat Samarinda mendapatkan Gratis Ongkir.');
        setSelectedShipping({ cost: 0, courierName: 'Kurir Lokal Samarinda (Free)' });
      } else {
        setShippingMessage(`📍 Berhasil mengambil tarif resmi Biteship (${data.calculatedWeightKg || 1} kg):`);
        setShippingOptions(data.results);
        if (data.results.length > 0) {
          setSelectedShipping({ cost: data.results[0].cost, courierName: data.results[0].courierName });
        }
      }
    } catch (err) {
      setShippingMessage('❌ Error: ' + err.message);
    } finally {
      setIsCheckingShipping(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!activeOrder) return;
    if (!confirm('Batalkan pesanan ini?')) return;

    try {
      const res = await fetch('/api/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: activeOrder.order_id }),
      });

      if (res.ok) {
        localStorage.removeItem('active_nfc_order_id');
        setActiveOrder(null);
        alert('Pesanan berhasil dibatalkan.');
        setStep(1);
      }
    } catch (err) {
      alert('Gagal membatalkan pesanan.');
    }
  };

  const handlePayExistingOrder = () => {
    if (!activeOrder || !activeOrder.snap_token) return;
    if (window.snap) {
      window.snap.pay(activeOrder.snap_token, {
        onSuccess: function () {
          localStorage.removeItem('active_nfc_order_id');
          setActiveOrder(null);
          alert('🎉 Pembayaran Berhasil!');
          router.push('/');
        },
      });
    }
  };

  const handleProcessCheckout = async (e) => {
    e.preventDefault();
    setOrderError('');

    const cityNameObj = (CITY_MAP[selectedProvince] || []).find((c) => c.id === selectedCity);
    const cityName = cityNameObj ? cityNameObj.name : selectedCity;
    const isSamarinda = cityName.toLowerCase().includes('samarinda') || selectedDistrict.toLowerCase().includes('samarinda');

    if (!selectedShipping && !isSamarinda) {
      alert('Silakan klik "Cek Tarif Ekspedisi" dan pilih kurir yang tersedia sebelum melakukan pembayaran.');
      return;
    }

    setIsCheckoutLoading(true);

    try {
      const fullAddressText = `${shippingAddress}, Kec. ${selectedDistrict}, ${cityName}, Kode Pos ${postalCode}`;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          shippingAddress: fullAddressText,
          destinationCity: cityName,
          postalCode,
          courierName: selectedShipping?.courierName || 'Lokal Samarinda Free',
          shippingCost: selectedShipping?.cost || 0,
          storeName,
          qty: orderQty,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Gagal checkout.');

      localStorage.setItem('active_nfc_order_id', data.orderId);

      if (window.snap && data.token) {
        window.snap.pay(data.token, {
          onSuccess: function () {
            localStorage.removeItem('active_nfc_order_id');
            setActiveOrder(null);
            alert('🎉 Pembayaran Berhasil!');
            router.push('/');
          },
          onPending: function () {
            checkSavedOrder();
          },
        });
      }
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  return (
    <div className={inter.className} style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px 24px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        
        {/* HEADER BAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
            ← Utama
          </Link>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', padding: '4px 10px', borderRadius: '20px' }}>
            {PROMO_TAG}
          </span>
        </div>

        {activeOrder ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <span style={{ fontSize: '42px' }}>⚠️</span>
            <h3 style={{ margin: '12px 0 6px 0', fontSize: '18px', fontWeight: '800' }}>Ada Pesanan Menggantung</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
              HP Anda memiliki transaksi pending <strong>({activeOrder.order_id})</strong> senilai <strong>Rp {Number(activeOrder.total_price).toLocaleString('id-ID')}</strong>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={handlePayExistingOrder} style={{ width: '100%', padding: '14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>
                💳 Lanjutkan Pembayaran
              </button>
              <button onClick={handleCancelOrder} style={{ width: '100%', padding: '12px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
                Batalkan & Buat Baru
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '10px 14px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626' }}>⏰ Promo Berakhir Dalam:</span>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#b91c1c', fontFamily: 'monospace' }}>{formatTimer(timeLeft)}</span>
            </div>

            {/* PROGRESS INDICATOR */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', padding: '0 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: step === 1 ? '#2563eb' : '#16a34a', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>1</span>
                <span style={{ fontSize: '13px', fontWeight: step === 1 ? '700' : '500', color: step === 1 ? '#0f172a' : '#64748b' }}>Data Pesanan</span>
              </div>
              <div style={{ flex: 1, height: '2px', backgroundColor: '#e2e8f0', margin: '0 12px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: step === 2 ? '#2563eb' : '#cbd5e1', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>2</span>
                <span style={{ fontSize: '13px', fontWeight: step === 2 ? '700' : '500', color: step === 2 ? '#0f172a' : '#94a3b8' }}>Alamat & Ongkir</span>
              </div>
            </div>

            {/* STEP 1: DATA DIRI & QTY */}
            {step === 1 && (
              <form onSubmit={handleNextToStep2} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800' }}>👤 Langkah 1: Data Pembeli</h2>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b' }}>Masukkan nama dan nomor WhatsApp untuk notifikasi pesanan.</p>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Nama Lengkap Pembeli *</label>
                  <input type="text" required placeholder="Contoh: Budi Santoso" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>No. WhatsApp *</label>
                  <input type="tel" required placeholder="08xxxxxxxxxx" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Nama Toko (Opsional)</label>
                    <input type="text" placeholder="Kopi Sedap" value={storeName} onChange={(e) => setStoreName(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Jumlah (Pcs)</label>
                    <input type="number" min="1" max="50" required value={orderQty} onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                    <span>Subtotal Akrilik ({orderQty} Pcs):</span>
                    <span style={{ color: '#16a34a', fontWeight: '800' }}>Rp {totalItemsPrice.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <button type="submit" style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
                  Lanjut ke Alamat Pengiriman ➔
                </button>
              </form>
            )}

            {/* STEP 2: DROPDOWN ALAMAT & ONGKIR BITESHIP */}
            {step === 2 && (
              <form onSubmit={handleProcessCheckout} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>📍 Langkah 2: Alamat Pengiriman</h2>
                  <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    ✏️ Edit Data Pembeli
                  </button>
                </div>

                {/* DROPDOWN PROVINSI */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Provinsi Tujuan *</label>
                  <select required value={selectedProvince} onChange={handleProvinceChange} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">-- Pilih Provinsi --</option>
                    {PROVINCE_LIST.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* DROPDOWN KOTA */}
                {selectedProvince && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Kota / Kabupaten Tujuan *</label>
                    <select required value={selectedCity} onChange={handleCityChange} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="">-- Pilih Kota/Kabupaten --</option>
                      {(CITY_MAP[selectedProvince] || []).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* DROPDOWN KECAMATAN */}
                {selectedCity && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Kecamatan Tujuan *</label>
                    <select required value={selectedDistrict} onChange={handleDistrictChange} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="">-- Pilih Kecamatan --</option>
                      {(DISTRICT_MAP[selectedCity] || []).map((d) => (
                        <option key={d.name} value={d.name}>{d.name} (Kode Pos: {d.postal})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* INPUT ALAMAT JALAN */}
                {selectedDistrict && (
                  <>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Alamat Jalan / Patokan *</label>
                      <textarea required placeholder="Jln. Ahmad Yani No. 12, RT 05..." value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', height: '55px', fontFamily: 'inherit' }} />
                    </div>

                    <button type="button" onClick={handleCheckShipping} disabled={isCheckingShipping} style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                      {isCheckingShipping ? 'Memeriksa Tarif Biteship...' : '🔍 Hitung Ongkir Real-time (Biteship)'}
                    </button>
                  </>
                )}

                {shippingMessage && <p style={{ margin: 0, fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>{shippingMessage}</p>}

                {/* DROPDOWN HASIL KURIR REAL BITESHIP */}
                {shippingOptions.length > 0 && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Pilih Kurir Ekspedisi *</label>
                    <select onChange={(e) => {
                      const selected = shippingOptions[e.target.value];
                      if (selected) setSelectedShipping({ cost: selected.cost, courierName: selected.courierName });
                    }} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff' }}>
                      {shippingOptions.map((opt, idx) => (
                        <option key={idx} value={idx}>
                          {opt.courierName} - Rp {opt.cost.toLocaleString('id-ID')} ({opt.etd})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* RINCIAN PERHITUNGAN */}
                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                    <span>Subtotal ({orderQty} Pcs):</span>
                    <span>Rp {totalItemsPrice.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                    <span>Ongkos Kirim:</span>
                    {selectedShipping?.cost === 0 ? (
                      <span style={{ color: '#16a34a', fontWeight: '800', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>🎉 FREE ONGKIR (Samarinda)</span>
                    ) : (
                      <span>Rp {shippingCost.toLocaleString('id-ID')}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: '#0f172a', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                    <span>Total Bayar:</span>
                    <span style={{ color: '#16a34a', fontSize: '18px' }}>Rp {grandTotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {orderError && <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', fontWeight: '600', textAlign: 'center' }}>{orderError}</p>}

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setStep(1)} style={{ flex: 1, padding: '16px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    ← Kembali
                  </button>
                  <button type="submit" disabled={isCheckoutLoading} style={{ flex: 2, padding: '16px', backgroundColor: isCheckoutLoading ? '#94a3b8' : '#16a34a', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: isCheckoutLoading ? 'not-allowed' : 'pointer' }}>
                    {isCheckoutLoading ? 'Memproses...' : '💳 Lanjut Bayar'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
