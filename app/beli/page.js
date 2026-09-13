'use client';

import { useState, useEffect } from 'react';

export default function BeliPage() {
  const [step, setStep] = useState(1);

  // Step 1: Data Pembeli
  const [buyerName, setBuyerName] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [qty, setQty] = useState(1);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  // Step 2: Alamat Pengiriman
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [streetAddress, setStreetAddress] = useState('');

  // Shipping & Pricing
  const [loadingOngkir, setLoadingOngkir] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFreeShipping, setIsFreeShipping] = useState(false);

  const itemPrice = 60000;
  const currentQty = Math.max(1, parseInt(qty, 10) || 1);
  const subtotal = itemPrice * currentQty;
  const shippingCost = selectedCourier ? selectedCourier.cost : 0;
  const totalAmount = subtotal + shippingCost;

  useEffect(() => {
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then((res) => res.json())
      .then((data) => setProvinces(data || []))
      .catch((err) => console.error(err));
  }, []);

  const handleProvinceChange = (e) => {
    const provId = e.target.value;
    const provObj = provinces.find((p) => p.id === provId);
    setSelectedProvince(provObj ? provObj.name : '');
    setSelectedCity('');
    setSelectedDistrict('');
    setRegencies([]);
    setDistricts([]);

    if (provId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`)
        .then((res) => res.json())
        .then((data) => setRegencies(data || []));
    }
  };

  const handleCityChange = (e) => {
    const regId = e.target.value;
    const regObj = regencies.find((r) => r.id === regId);
    setSelectedCity(regObj ? regObj.name : '');
    setSelectedDistrict('');
    setDistricts([]);

    if (regId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regId}.json`)
        .then((res) => res.json())
        .then((data) => setDistricts(data || []));
    }
  };

  const handleDistrictChange = (e) => {
    const distId = e.target.value;
    const distObj = districts.find((d) => d.id === distId);
    setSelectedDistrict(distObj ? distObj.name : '');
  };

  const handleCekOngkir = async () => {
    if (!selectedCity || !postalCode) {
      setErrorMessage('Pilih Kota dan masukkan Kode Pos terlebih dahulu.');
      return;
    }
    setLoadingOngkir(true);
    setErrorMessage('');
    setShippingOptions([]);
    setSelectedCourier(null);

    try {
      const res = await fetch('/api/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationPostalCode: postalCode,
          destinationCityName: selectedCity,
          destinationDistrictName: selectedDistrict,
          qty: currentQty,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Gagal mengambil ongkir.');
      } else {
        setIsFreeShipping(data.isFreeShipping);
        setShippingOptions(data.results || []);
        if (data.results?.length > 0) setSelectedCourier(data.results[0]);
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan server.');
    } finally {
      setLoadingOngkir(false);
    }
  };

  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (waNumber.length < 8) {
      alert('Nomor WhatsApp wajib diisi minimal 8 digit!');
      return;
    }
    setStep(2);
  };

  // Styles Object
  const styles = {
    wrapper: { minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '16px', fontFamily: 'sans-serif' },
    card: { maxWidth: '440px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' },
    promoBanner: { backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
    stepper: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '24px' },
    stepItem: (active) => ({ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: active ? 'bold' : '500', color: active ? '#2563eb' : '#9ca3af' }),
    stepCircle: (active) => ({ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: active ? '#2563eb' : '#e5e7eb', color: active ? '#ffffff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }),
    label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
    input: { width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' },
    btnPrimary: { width: '100%', backgroundColor: '#2563eb', color: '#ffffff', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
    btnSuccess: { width: '100%', backgroundColor: '#10b981', color: '#ffffff', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' },
    summaryBox: { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '16px', borderRadius: '16px', marginTop: '20px' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#4b5563', marginBottom: '8px' },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        
        {/* Header Promo */}
        <div style={styles.promoBanner}>
          <span>🔥 PROMO SPESIAL 60% OFF</span>
          <span>⏰ 14:28</span>
        </div>

        {/* Stepper */}
        <div style={styles.stepper}>
          <div style={styles.stepItem(step === 1)}>
            <div style={styles.stepCircle(step === 1)}>1</div>
            <span>Data Pesanan</span>
          </div>
          <div style={{ width: '30px', height: '2px', backgroundColor: '#e5e7eb' }}></div>
          <div style={styles.stepItem(step === 2)}>
            <div style={styles.stepCircle(step === 2)}>2</div>
            <span>Alamat & Ongkir</span>
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleNextStep1}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>Langkah 1: Data Pemesan</h2>
            
            <label style={styles.label}>Nama Lengkap *</label>
            <input type="text" required placeholder="Masukkan nama Anda" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} style={styles.input} />

            <label style={styles.label}>Nomor WhatsApp (Min. 8 Digit) *</label>
            <input type="tel" inputMode="numeric" pattern="[0-9]*" minLength={8} required placeholder="Contoh: 08123456789" value={waNumber} onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, ''))} style={styles.input} />

            <label style={styles.label}>Jumlah Pesanan (Pcs) *</label>
            <input type="number" min="1" required value={qty} onChange={(e) => setQty(e.target.value)} onBlur={() => { if (qty === '' || parseInt(qty) < 1) setQty(1); }} style={styles.input} />

            <label style={styles.label}>Link Google Maps Usaha (Opsional)</label>
            <input type="url" placeholder="https://maps.google.com/..." value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} style={styles.input} />

            <button type="submit" style={styles.btnPrimary}>Lanjut ke Alamat ➔</button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>📍 Langkah 2: Alamat</h2>
              <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>✏️ Edit Data</button>
            </div>

            <label style={styles.label}>Provinsi Tujuan *</label>
            <select onChange={handleProvinceChange} style={styles.input}>
              <option value="">-- Pilih Provinsi --</option>
              {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <label style={styles.label}>Kota / Kabupaten Tujuan *</label>
            <select onChange={handleCityChange} disabled={!regencies.length} style={styles.input}>
              <option value="">-- Pilih Kota / Kabupaten --</option>
              {regencies.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            <label style={styles.label}>Kecamatan Tujuan *</label>
            <select onChange={handleDistrictChange} disabled={!districts.length} style={styles.input}>
              <option value="">-- Pilih Kecamatan --</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            <label style={styles.label}>Kode Pos *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="tel" inputMode="numeric" maxLength={5} placeholder="11210" value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))} style={{ ...styles.input, marginBottom: 0 }} />
              <button type="button" onClick={handleCekOngkir} disabled={loadingOngkir || !postalCode || !selectedCity} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', padding: '0 16px', fontWeight: 'bold', cursor: 'pointer', minWidth: '110px' }}>
                {loadingOngkir ? 'Memuat...' : '🔍 Cek'}
              </button>
            </div>

            <label style={{ ...styles.label, marginTop: '14px' }}>Alamat Jalan / Patokan *</label>
            <textarea rows={2} required placeholder="Jln. Ahmad Yani No. 12..." value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} style={{ ...styles.input, height: 'auto' }} />

            {errorMessage && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '14px' }}>❌ {errorMessage}</div>}

            {shippingOptions.length > 0 && (
              <div>
                <label style={styles.label}>Pilih Kurir Ekspedisi *</label>
                <select onChange={(e) => {
                  const found = shippingOptions.find(opt => opt.courierCode + opt.service === e.target.value);
                  if (found) setSelectedCourier(found);
                }} style={{ ...styles.input, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af', fontWeight: 'bold' }}>
                  {shippingOptions.map(opt => (
                    <option key={opt.courierCode + opt.service} value={opt.courierCode + opt.service}>
                      {opt.courierName} - Rp {opt.cost.toLocaleString('id-ID')} ({opt.etd})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}><span>Subtotal ({currentQty} Pcs):</span><span>Rp {subtotal.toLocaleString('id-ID')}</span></div>
              <div style={styles.summaryRow}><span>Ongkos Kirim:</span><span>{isFreeShipping ? 'FREE (Lokal)' : `Rp ${shippingCost.toLocaleString('id-ID')}`}</span></div>
              <div style={{ ...styles.summaryRow, borderTop: '1px border #e5e7eb', paddingTop: '10px', marginTop: '10px', fontWeight: 'bold', fontSize: '16px', color: '#059669' }}>
                <span>Total Bayar:</span><span>Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="button" onClick={() => setStep(1)} style={{ width: '35%', backgroundColor: '#fff', border: '1px solid #d1d5db', color: '#374151', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>← Kembali</button>
              <button type="button" disabled={!selectedCourier || !streetAddress} style={{ ...styles.btnSuccess, width: '65%', opacity: (!selectedCourier || !streetAddress) ? 0.5 : 1 }}>💳 Lanjut Bayar</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
