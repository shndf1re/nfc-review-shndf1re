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

  // Shipping Rates & Loading States
  const [loadingOngkir, setLoadingOngkir] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFreeShipping, setIsFreeShipping] = useState(false);

  // Harga Produk
  const itemPrice = 60000;
  const currentQty = Math.max(1, parseInt(qty, 10) || 1);
  const subtotal = itemPrice * currentQty;
  const shippingCost = selectedCourier ? selectedCourier.cost : 0;
  const totalAmount = subtotal + shippingCost;

  // Load Provinsi via API EMSIFA
  useEffect(() => {
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then((res) => res.json())
      .then((data) => setProvinces(data || []))
      .catch((err) => console.error('Gagal load provinsi:', err));
  }, []);

  // Handle Pilih Provinsi
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
        .then((data) => setRegencies(data || []))
        .catch((err) => console.error('Gagal load kota:', err));
    }
  };

  // Handle Pilih Kota
  const handleCityChange = (e) => {
    const regId = e.target.value;
    const regObj = regencies.find((r) => r.id === regId);
    setSelectedCity(regObj ? regObj.name : '');
    setSelectedDistrict('');
    setDistricts([]);

    if (regId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regId}.json`)
        .then((res) => res.json())
        .then((data) => setDistricts(data || []))
        .catch((err) => console.error('Gagal load kecamatan:', err));
    }
  };

  // Handle Pilih Kecamatan
  const handleDistrictChange = (e) => {
    const distId = e.target.value;
    const distObj = districts.find((d) => d.id === distId);
    setSelectedDistrict(distObj ? distObj.name : '');
  };

  // Panggil API Cek Ongkir
  const handleCekOngkir = async () => {
    if (!selectedCity || !postalCode) {
      setErrorMessage('Pilih Kota/Kabupaten dan masukkan Kode Pos terlebih dahulu.');
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

  // Next Step 1 -> 2 Validation
  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (waNumber.length < 8) {
      alert('Nomor WhatsApp wajib diisi minimal 8 digit!');
      return;
    }
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden p-6">
        
        {/* Header Step Progress */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div className={`flex items-center space-x-2 ${step === 1 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
            <span className="w-7 h-7 flex items-center justify-center rounded-full border border-current">1</span>
            <span>Data Pesanan</span>
          </div>
          <div className="w-8 border-t border-gray-300"></div>
          <div className={`flex items-center space-x-2 ${step === 2 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
            <span className="w-7 h-7 flex items-center justify-center rounded-full border border-current">2</span>
            <span>Alamat & Ongkir</span>
          </div>
        </div>

        {/* STEP 1: DATA PEMBELI */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Langkah 1: Data Pemesan</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                placeholder="Masukkan nama Anda"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp (Min. 8 Digit) *</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                minLength={8}
                required
                placeholder="Contoh: 08123456789"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pesanan (Pcs) *</label>
              <input
                type="number"
                min="1"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                onBlur={() => {
                  if (qty === '' || parseInt(qty, 10) < 1) setQty(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link Google Maps Usaha (Opsional)</label>
              <input
                type="url"
                placeholder="https://maps.google.com/..."
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200 mt-4"
            >
              Lanjut ke Alamat ➔
            </button>
          </form>
        )}

        {/* STEP 2: ALAMAT PENGIRIMAN & CEK ONGKIR */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Langkah 2: Alamat Pengiriman</h2>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                ✏️ Edit Data Pembeli
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi Tujuan *</label>
              <select
                onChange={handleProvinceChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Pilih Provinsi --</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kota / Kabupaten Tujuan *</label>
              <select
                onChange={handleCityChange}
                disabled={!regencies.length}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              >
                <option value="">-- Pilih Kota / Kabupaten --</option>
                {regencies.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan Tujuan *</label>
              <select
                onChange={handleDistrictChange}
                disabled={!districts.length}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              >
                <option value="">-- Pilih Kecamatan --</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  maxLength={5}
                  placeholder="Kode Pos *"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleCekOngkir}
                disabled={loadingOngkir || !postalCode || !selectedCity}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition disabled:bg-gray-300"
              >
                {loadingOngkir ? 'Memuat...' : '🔍 Cek Ongkir'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Jalan / Patokan *</label>
              <textarea
                rows={2}
                required
                placeholder="Jl. Ahmad Yani No. 12, RT 05 / RW 02..."
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                ❌ Error: {errorMessage}
              </div>
            )}

            {/* Pilihan Kurir */}
            {shippingOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Kurir Ekspedisi *</label>
                <select
                  onChange={(e) => {
                    const found = shippingOptions.find((opt) => opt.courierCode + opt.service === e.target.value);
                    if (found) setSelectedCourier(found);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50"
                >
                  {shippingOptions.map((opt) => (
                    <option key={opt.courierCode + opt.service} value={opt.courierCode + opt.service}>
                      {opt.courierName} - Rp {opt.cost.toLocaleString('id-ID')} ({opt.etd})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ringkasan Biaya */}
            <div className="bg-gray-50 p-4 rounded-xl border space-y-2 mt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal ({currentQty} Pcs):</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Ongkos Kirim:</span>
                <span>{isFreeShipping ? 'FREE (Lokal Samarinda)' : `Rp ${shippingCost.toLocaleString('id-ID')}`}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-emerald-600 border-t pt-2">
                <span>Total Bayar:</span>
                <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-100"
              >
                ← Kembali
              </button>
              <button
                type="button"
                disabled={!selectedCourier || !streetAddress}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition disabled:bg-gray-300"
              >
                💳 Lanjut Bayar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
