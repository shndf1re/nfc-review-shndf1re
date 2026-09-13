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

export default function OrderPage() {
  const router = useRouter();

  const [activeOrder, setActiveOrder] = useState(null);
  const [checkingOrder, setCheckingOrder] = useState(true);

  // CONTROL STEP (1 = Data Diri, 2 = Alamat & Ongkir)
  const [step, setStep] = useState(1);

  // STEP 1 STATE
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [orderQty, setOrderQty] = useState(1);

  // STEP 2 STATE (DATA WILAYAH INDONESIA VIA API)
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [selectedProvObj, setSelectedProvObj] = useState(null);
  const [selectedRegObj, setSelectedRegObj] = useState(null);
  const [selectedDistObj, setSelectedDistObj] = useState(null);

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
    fetchProvinces();
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // LOAD PROVINSI SE-INDONESIA
  const fetchProvinces = async () => {
    try {
      const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
      const data = await res.json();
      setProvinces(data || []);
    } catch (err) {
      console.error('Gagal load provinsi:', err);
    }
  };

  const handleProvinceChange = async (e) => {
    const provId = e.target.value;
    const provObj = provinces.find((p) => p.id === provId);
    setSelectedProvObj(provObj || null);
    setSelectedRegObj(null);
    setSelectedDistObj(null);
    setRegencies([]);
    setDistricts([]);
    setPostalCode('');
    setShippingOptions([]);
    setSelectedShipping(null);
    setShippingMessage('');

    if (provId) {
      try {
        const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`);
        const data = await res.json();
        setRegencies(data || []);
      } catch (err) {
        console.error('Gagal load kota:', err);
      }
    }
  };

  const handleRegencyChange = async (e) => {
    const regId = e.target.value;
    const regObj = regencies.find((r) => r.id === regId);
    setSelectedRegObj(regObj || null);
    setSelectedDistObj(null);
    setDistricts([]);
    setPostalCode('');
    setShippingOptions([]);
    setSelectedShipping(null);
    setShippingMessage('');

    if (regId) {
      try {
        const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regId}.json`);
        const data = await res.json();
        setDistricts(data || []);
      } catch (err) {
        console.error('Gagal load kecamatan:', err);
      }
    }
  };

  const handleDistrictChange = (e) => {
    const distId = e.target.value;
    const distObj = districts.find((d) => d.id === distId);
    setSelectedDistObj(distObj || null);
    setShippingOptions([]);
    setSelectedShipping(null);
    setShippingMessage('');

    // Pre-fill postal code default untuk Samarinda / Jabodetabek jika belum mengetik
    if (distObj && distObj.name.toLowerCase().includes('samarinda ulu')) {
      setPostalCode('75125');
    }
  };

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

  const handleNextToStep2 = (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Nama Lengkap dan Nomor WhatsApp wajib diisi.');
      return;
    }
    setStep(2);
  };

  // HANDLER CEK ONGKIR BITESHIP REAL-TIME
  const handleCheckShipping = async () => {
    if (!selectedRegObj || !selectedDistObj || !postalCode) {
      alert('Silakan pilih Kota, Kecamatan, dan masukkan Kode Pos 5 digit terlebih dahulu.');
      return;
    }

    setIsCheckingShipping(true);
    setShippingMessage('');
    setShippingOptions([]);
    setSelectedShipping(null);

    try {
      const res = await fetch('/api/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationCityName: selectedRegObj.name,
          destinationDistrictName: selectedDistObj.name,
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
        alert('Pesanan dibatalkan.');
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

    const isSamarinda = selectedRegObj?.name.toLowerCase().includes('samarinda') || selectedDistObj?.name.toLowerCase().includes('samarinda');
    if (!selectedShipping && !isSamarinda) {
      alert('Silakan klik "Hitung Ongkir Real-time" dan pilih kurir pengiriman terlebih dahulu.');
      return;
    }

    setIsCheckoutLoading(true);

    try {
      const fullAddressText = `${shippingAddress}, Kec. ${selectedDistObj?.name}, ${selectedRegObj?.name}, ${selectedProvObj?.name}, Kode Pos ${postalCode}`;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          shippingAddress: fullAddressText,
          destinationCity: selectedRegObj?.name || 'Luar Kota',
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

            {/* INDICATOR STEP */}
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

            {/* STEP 1 */}
            {step === 1 && (
              <form onSubmit={handleNextToStep2} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800' }}>👤 Langkah 1: Data Pembeli</h2>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b' }}>Isi data pemesan dan jumlah akrilik yang diinginkan.</p>

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

            {/* STEP 2 */}
            {step === 2 && (
              <form onSubmit={handleProcessCheckout} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>📍 Langkah 2: Alamat Pengiriman</h2>
                  <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    ✏️ Edit Data Pembeli
                  </button>
                </div>

                {/* PROVINSI */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Provinsi Tujuan *</label>
                  <select required value={selectedProvObj?.id || ''} onChange={handleProvinceChange} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                    <option value="">-- Pilih Provinsi --</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* KOTA */}
                {regencies.length > 0 && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Kota / Kabupaten Tujuan *</label>
                    <select required value={selectedRegObj?.id || ''} onChange={handleRegencyChange} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="">-- Pilih Kota/Kabupaten --</option>
                      {regencies.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* KECAMATAN */}
                {districts.length > 0 && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Kecamatan Tujuan *</label>
                    <select required value={selectedDistObj?.id || ''} onChange={handleDistrictChange} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                      <option value="">-- Pilih Kecamatan --</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* KODE POS & ALAMAT JALAN */}
                {selectedDistObj && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Kode Pos *</label>
                        <input type="text" required maxLength={5} placeholder="Contoh: 40111" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button type="button" onClick={handleCheckShipping} disabled={isCheckingShipping} style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          {isCheckingShipping ? '...' : '🔍 Cek Ongkir'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Alamat Jalan / Patokan *</label>
                      <textarea required placeholder="Jln. Ahmad Yani No. 12, RT 05..." value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', height: '55px', fontFamily: 'inherit' }} />
                    </div>
                  </>
                )}

                {shippingMessage && <p style={{ margin: 0, fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>{shippingMessage}</p>}

                {/* DROPDOWN EXPEDITION RESULTS */}
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
