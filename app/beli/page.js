'use client';

import { useState, useEffect } from 'react';

export default function BeliPage() {
  const [step, setStep] = useState(1);

  // === COUNTDOWN TIMER PROMO (15 Menit / 900 Detik) ===
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // === STEP 1: DATA PEMBELI ===
  const [buyerName, setBuyerName] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [qty, setQty] = useState(1);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  // === STEP 2: ALAMAT PENGIRIMAN EMSIFA V2 ===
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedRegencyId, setSelectedRegencyId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  
  const [selectedProvinceName, setSelectedProvinceName] = useState('');
  const [selectedRegencyName, setSelectedRegencyName] = useState('');
  const [selectedDistrictName, setSelectedDistrictName] = useState('');
  const [selectedVillageName, setSelectedVillageName] = useState('');
  
  const [postalCode, setPostalCode] = useState('');
  const [streetAddress, setStreetAddress] = useState('');

  // === SHIPPING & PRICING ===
  const [loadingOngkir, setLoadingOngkir] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFreeShipping, setIsFreeShipping] = useState(false);
  const [loadingPay, setLoadingPay] = useState(false);

  const itemPrice = 60000;
  const currentQty = Math.max(1, parseInt(qty, 10) || 1);
  const subtotal = itemPrice * currentQty;
  const shippingCost = selectedCourier ? selectedCourier.cost : 0;
  const totalAmount = subtotal + shippingCost;

  // === 1. LOAD PROVINSI EMSIFA V2 ===
  useEffect(() => {
    fetch('https://www.emsifa.com/api-wilayah-indonesia/v2/provinces.json')
      .then((res) => res.json())
      .then((json) => setProvinces(json.data || []))
      .catch((err) => console.error('Gagal load provinsi:', err));
  }, []);

  // === 2. HANDLE PROVINSI CHANGE ===
  const handleProvinceChange = (e) => {
    const provId = e.target.value;
    setSelectedProvinceId(provId);
    
    const provObj = provinces.find((p) => p.id === provId);
    setSelectedProvinceName(provObj ? provObj.name : '');

    // Reset turunan
    setSelectedRegencyId('');
    setSelectedRegencyName('');
    setSelectedDistrictId('');
    setSelectedDistrictName('');
    setSelectedVillageName('');
    setPostalCode('');
    setRegencies([]);
    setDistricts([]);
    setVillages([]);

    if (provId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/v2/regencies/${provId}.json`)
        .then((res) => res.json())
        .then((json) => setRegencies(json.data || []))
        .catch((err) => console.error('Gagal load kab/kota:', err));
    }
  };

  // === 3. HANDLE KOTA/KABUPATEN CHANGE ===
  const handleRegencyChange = (e) => {
    const regId = e.target.value;
    setSelectedRegencyId(regId);
    
    const regObj = regencies.find((r) => r.id === regId);
    setSelectedRegencyName(regObj ? regObj.name : '');

    // Reset turunan
    setSelectedDistrictId('');
    setSelectedDistrictName('');
    setSelectedVillageName('');
    setPostalCode('');
    setDistricts([]);
    setVillages([]);

    if (regId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/v2/districts/${regId}.json`)
        .then((res) => res.json())
        .then((json) => setDistricts(json.data || []))
        .catch((err) => console.error('Gagal load kecamatan:', err));
    }
  };

  // === 4. HANDLE KECAMATAN CHANGE ===
  const handleDistrictChange = (e) => {
    const distId = e.target.value;
    setSelectedDistrictId(distId);
    
    const distObj = districts.find((d) => d.id === distId);
    setSelectedDistrictName(distObj ? distObj.name : '');

    // Reset turunan
    setSelectedVillageName('');
    setPostalCode('');
    setVillages([]);

    if (distId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/v2/villages/${distId}.json`)
        .then((res) => res.json())
        .then((json) => setVillages(json.data || []))
        .catch((err) => console.error('Gagal load kelurahan:', err));
    }
  };

  // === 5. HANDLE KELURAHAN / KODE POS CHANGE ===
  const handleVillageChange = (e) => {
    const villageName = e.target.value;
    setSelectedVillageName(villageName);

    const villageObj = villages.find((v) => v.name === villageName);
    if (villageObj && villageObj.postal_code) {
      setPostalCode(villageObj.postal_code);
    } else {
      setPostalCode('');
    }
  };

  // === CEK ONGKIR BITESHIP ===
  const handleCekOngkir = async () => {
    if (!selectedRegencyName || !postalCode) {
      setErrorMessage('Pilih wilayah lengkap dan kode pos terlebih dahulu.');
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
          destinationCityName: selectedRegencyName,
          destinationDistrictName: selectedDistrictName,
          qty: currentQty,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Gagal menghitung ongkos kirim.');
      } else {
        setIsFreeShipping(data.isFreeShipping);
        setShippingOptions(data.results || []);
        if (data.results && data.results.length > 0) {
          setSelectedCourier(data.results[0]);
        }
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
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

  // === PROSES BAYAR MIDTRANS SNAP ===
  const handlePay = async () => {
    if (!selectedCourier || !streetAddress) {
      alert('Lengkapi alamat dan pilih kurir terlebih dahulu.');
      return;
    }

    setLoadingPay(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: buyerName,
          customerPhone: waNumber,
          shippingAddress: streetAddress,
          destinationCity: `${selectedDistrictName}, ${selectedRegencyName}, ${selectedProvinceName}`,
          postalCode: postalCode,
          storeName: buyerName,
          targetUrl: googleMapsUrl,
          qty: currentQty,
          courierName: selectedCourier.courierName,
          shippingCost: shippingCost,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        alert(data.error || 'Gagal membuat transaksi Midtrans.');
        setLoadingPay(false);
        return;
      }

      if (typeof window !== 'undefined' && window.snap) {
        window.snap.pay(data.token, {
          onSuccess: function () {
            alert('Pembayaran Berhasil!');
            window.location.href = '/';
          },
          onPending: function () {
            alert('Menunggu Pembayaran...');
          },
          onError: function () {
            alert('Pembayaran Gagal!');
          },
          onClose: function () {
            alert('Anda menutup popup pembayaran.');
          },
        });
      } else {
        alert('SDK Midtrans belum siap di browser. Silakan coba refresh halaman.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi: ' + err.message);
    } finally {
      setLoadingPay(false);
    }
  };

  // Styling Inline Murni
  const styles = {
    pageContainer: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px 12px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      boxSizing: 'border-box',
    },
    card: {
      width: '100%',
      maxWidth: '430px',
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      padding: '20px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
      border: '1px solid #e2e8f0',
      boxSizing: 'border-box',
    },
    topHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
    },
    backLink: {
      color: '#64748b',
      textDecoration: 'none',
      fontSize: '13px',
      fontWeight: '600',
    },
    badgePromo: {
      backgroundColor: '#fef2f2',
      color: '#ef4444',
      fontSize: '11px',
      fontWeight: 'bold',
      padding: '4px 10px',
      borderRadius: '20px',
      border: '1px solid #fee2e2',
    },
    timerBanner: {
      backgroundColor: '#fff5f5',
      border: '1px solid #fed7d7',
      color: '#e53e3e',
      borderRadius: '14px',
      padding: '10px 14px',
      fontSize: '13px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    stepperContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '24px',
    },
    stepBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      fontWeight: 'bold',
    },
    circleNumber: (active, isGreen) => ({
      width: '26px',
      height: '26px',
      borderRadius: '50%',
      backgroundColor: active ? (isGreen ? '#22c55e' : '#2563eb') : '#e2e8f0',
      color: active ? '#ffffff' : '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
    }),
    stepDivider: {
      width: '32px',
      height: '2px',
      backgroundColor: '#cbd5e1',
    },
    formTitle: {
      fontSize: '18px',
      fontWeight: '800',
      color: '#0f172a',
      marginBottom: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '700',
      color: '#334155',
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: '12px',
      border: '1.5px solid #cbd5e1',
      fontSize: '14px',
      color: '#0f172a',
      outline: 'none',
      boxSizing: 'border-box',
      marginBottom: '14px',
      backgroundColor: '#ffffff',
    },
    select: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: '12px',
      border: '1.5px solid #cbd5e1',
      fontSize: '14px',
      color: '#0f172a',
      outline: 'none',
      boxSizing: 'border-box',
      marginBottom: '14px',
      backgroundColor: '#ffffff',
    },
    btnBlue: {
      width: '100%',
      backgroundColor: '#2563eb',
      color: '#ffffff',
      padding: '14px',
      borderRadius: '14px',
      border: 'none',
      fontSize: '15px',
      fontWeight: 'bold',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
    },
    btnGreen: (disabled) => ({
      width: '65%',
      backgroundColor: disabled ? '#94a3b8' : '#16a34a',
      color: '#ffffff',
      padding: '14px',
      borderRadius: '14px',
      border: 'none',
      fontSize: '15px',
      fontWeight: 'bold',
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : '0 4px 12px rgba(22, 163, 74, 0.2)',
    }),
    summaryCard: {
      backgroundColor: '#f8fafc',
      borderRadius: '16px',
      padding: '16px',
      border: '1px solid #e2e8f0',
      marginTop: '20px',
    },
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '13px',
      color: '#64748b',
      marginBottom: '8px',
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#16a34a',
      borderTop: '1px dashed #cbd5e1',
      paddingTop: '10px',
      marginTop: '10px',
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        
        <div style={styles.topHeader}>
          <a href="/" style={styles.backLink}>← Utama</a>
          <div style={styles.badgePromo}>🔥 PROMO SPESIAL 60% OFF</div>
        </div>

        <div style={styles.timerBanner}>
          <span style={{ fontWeight: '600' }}>⏰ Promo Berakhir Dalam:</span>
          <span style={{ fontWeight: 'bold' }}>{formatTime(timeLeft)}</span>
        </div>

        <div style={styles.stepperContainer}>
          <div style={styles.stepBox}>
            <div style={styles.circleNumber(true, true)}>1</div>
            <span style={{ color: step === 1 ? '#0f172a' : '#64748b' }}>Data Pesanan</span>
          </div>
          <div style={styles.stepDivider}></div>
          <div style={styles.stepBox}>
            <div style={styles.circleNumber(step === 2, false)}>2</div>
            <span style={{ color: step === 2 ? '#2563eb' : '#94a3b8' }}>Alamat & Ongkir</span>
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleNextStep1}>
            <div style={styles.formTitle}>Langkah 1: Data Pemesan</div>
            
            <label style={styles.label}>Nama Lengkap *</label>
            <input
              type="text"
              required
              placeholder="Masukkan nama Anda"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Nomor WhatsApp (Min. 8 Digit) *</label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              minLength={8}
              required
              placeholder="Contoh: 08123456789"
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, ''))}
              style={styles.input}
            />

            <label style={styles.label}>Jumlah Pesanan (Pcs) *</label>
            <input
              type="number"
              min="1"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onBlur={() => {
                if (qty === '' || parseInt(qty, 10) < 1) setQty(1);
              }}
              style={styles.input}
            />

            <label style={styles.label}>Link Google Maps Usaha (Opsional)</label>
            <input
              type="url"
              placeholder="https://maps.google.com/..."
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              style={styles.input}
            />

            <button type="submit" style={styles.btnBlue}>
              Lanjut ke Alamat ➔
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div style={styles.formTitle}>
              <span>📍 Langkah 2: Alamat Pengiriman</span>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                ✏️ Edit Data Pemesan
              </button>
            </div>

            {/* PROVINSI */}
            <label style={styles.label}>Provinsi Tujuan *</label>
            <select value={selectedProvinceId} onChange={handleProvinceChange} style={styles.select}>
              <option value="">-- Pilih Provinsi --</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* KOTA / KABUPATEN */}
            <label style={styles.label}>Kota / Kabupaten Tujuan *</label>
            <select value={selectedRegencyId} onChange={handleRegencyChange} disabled={!regencies.length} style={styles.select}>
              <option value="">-- Pilih Kota / Kabupaten --</option>
              {regencies.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            {/* KECAMATAN */}
            <label style={styles.label}>Kecamatan Tujuan *</label>
            <select value={selectedDistrictId} onChange={handleDistrictChange} disabled={!districts.length} style={styles.select}>
              <option value="">-- Pilih Kecamatan --</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* KELURAHAN (PILIH KELURAHAN UNTUK MUNCULKAN KODE POS OTOMATIS) */}
            <label style={styles.label}>Kelurahan / Desa *</label>
            <select value={selectedVillageName} onChange={handleVillageChange} disabled={!villages.length} style={styles.select}>
              <option value="">-- Pilih Kelurahan --</option>
              {villages.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name} {v.postal_code ? `(Kode Pos: ${v.postal_code})` : ''}
                </option>
              ))}
            </select>

            {/* KODE POS OTOMATIS TERISI */}
            <label style={styles.label}>Kode Pos *</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                readOnly
                placeholder="Otomatis terisi dari kelurahan"
                value={postalCode}
                style={{ ...styles.input, marginBottom: 0, flex: 1, backgroundColor: '#f1f5f9', fontWeight: 'bold' }}
              />

              <button
                type="button"
                onClick={handleCekOngkir}
                disabled={loadingOngkir || !postalCode || !selectedRegencyName}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0 16px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  opacity: (loadingOngkir || !postalCode || !selectedRegencyName) ? 0.6 : 1,
                }}
              >
                {loadingOngkir ? 'Memuat...' : '🔍 Cek Ongkir'}
              </button>
            </div>

            <label style={styles.label}>Alamat Jalan / Patokan *</label>
            <textarea
              rows={2}
              required
              placeholder="Jln. Ahmad Yani No. 12, RT 05..."
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              style={{ ...styles.input, height: 'auto', fontFamily: 'inherit' }}
            />

            {errorMessage && (
              <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', border: '1px solid #fee2e2', marginBottom: '14px' }}>
                ❌ Error: {errorMessage}
              </div>
            )}

            {shippingOptions.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <label style={styles.label}>Pilih Kurir Ekspedisi *</label>
                <select
                  value={selectedCourier ? selectedCourier.courierCode + selectedCourier.service : ''}
                  onChange={(e) => {
                    const found = shippingOptions.find((opt) => opt.courierCode + opt.service === e.target.value);
                    if (found) setSelectedCourier(found);
                  }}
                  style={{ ...styles.select, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af', fontWeight: 'bold' }}
                >
                  {shippingOptions.map((opt) => (
                    <option key={opt.courierCode + opt.service} value={opt.courierCode + opt.service}>
                      {opt.courierName} - Rp {opt.cost.toLocaleString('id-ID')} ({opt.etd})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.summaryCard}>
              <div style={styles.summaryRow}>
                <span>Subtotal ({currentQty} Pcs):</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Ongkos Kirim:</span>
                <span>{isFreeShipping ? 'FREE (Lokal Samarinda)' : `Rp ${shippingCost.toLocaleString('id-ID')}`}</span>
              </div>
              <div style={styles.totalRow}>
                <span>Total Bayar:</span>
                <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  width: '35%',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#475569',
                  padding: '14px',
                  borderRadius: '14px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                ← Kembali
              </button>
              
              <button
                type="button"
                onClick={handlePay}
                disabled={!selectedCourier || !streetAddress || loadingPay}
                style={styles.btnGreen(!selectedCourier || !streetAddress || loadingPay)}
              >
                {loadingPay ? 'Memproses...' : '💳 Lanjut Bayar'}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
