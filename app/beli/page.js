'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

  // Load Provinsi via Emsifa
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

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-6">
        
        {/* Banner Promo */}
        <div className="flex justify-between items-center mb-4">
          <Link href="/" className="text-gray-500 hover:text-gray-700 font-medium text-sm">
            ← Utama
          </Link>
          <div className="bg-red-100 text-red-600 font-bold px-3 py-1 rounded-full text-xs flex items-center">
            🔥 PROMO SPESIAL 60% OFF
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl flex justify-between items-center mb-6 text-sm">
          <span className="font-semibold flex items-center gap-1">⏰ Promo Berakhir Dalam:</span>
          <span className="font-bold">14:28</span>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center space-x-4 mb-8 text-sm">
          <div className={`flex items-center space-x-2 ${step === 1 ? 'text-emerald-600 font-bold' : 'text-gray-400 font-medium'}`}>
            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-white ${step === 1 ? 'bg-emerald-500' : 'bg-gray-300'}`}>1</span>
            <span>Data Pesanan</span>
          </div>
          <div className="w-8 border-t-2 border-gray-200"></div>
          <div className={`flex items-center space-x-2 ${step === 2 ? 'text-blue-600 font-bold' : 'text-gray-400 font-medium'}`}>
            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-white ${step === 2 ? 'bg-blue-600' : 'bg-gray-300'}`}>2</span>
            <span>Alamat & Ongkir</span>
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Langkah 1: Data Pemesan</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Lengkap *</label>
              <input type="text" required placeholder="Masukkan nama Anda" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nomor WhatsApp (Min. 8 Digit) *</label>
              <input 
                type="tel" inputMode="numeric" pattern="[0-9]*" minLength={8} required placeholder="Contoh: 08123456789" 
                value={waNumber} 
                onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, ''))} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Jumlah Pesanan (Pcs) *</label>
              <input 
                type="number" min="1" required 
                value={qty} 
                onChange={(e) => setQty(e.target.value)}
                onBlur={() => { if (qty === '' || parseInt(qty) < 1) setQty(1); }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Link Google Maps Usaha (Opsional)</label>
              <input type="url" placeholder="https://maps.google.com/..." value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition duration-200 mt-6 shadow-md">
              Lanjut ke Alamat ➔
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-1">📍 Langkah 2: Alamat Pengiriman</h2>
              <button onClick={() => setStep(1)} className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1">
                ✏️ Edit Data Pembeli
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Provinsi Tujuan *</label>
              <select onChange={handleProvinceChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                <option value="">-- Pilih Provinsi --</option>
                {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Kota / Kabupaten Tujuan *</label>
              <select onChange={handleCityChange} disabled={!regencies.length} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 text-sm text-gray-700">
                <option value="">-- Pilih Kota / Kabupaten --</option>
                {regencies.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Kecamatan Tujuan *</label>
              <select onChange={handleDistrictChange} disabled={!districts.length} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 text-sm text-gray-700">
                <option value="">-- Pilih Kecamatan --</option>
                {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Kode Pos *</label>
              <div className="flex gap-2">
                <input type="text" maxLength={5} placeholder="11210" value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                <button type="button" onClick={handleCekOngkir} disabled={loadingOngkir || !postalCode || !selectedCity} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-md disabled:bg-gray-400 text-sm flex items-center gap-1">
                  {loadingOngkir ? 'Memuat...' : '🔍 Cek Ongkir'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Alamat Jalan / Patokan *</label>
              <textarea rows={2} required placeholder="Jln. Ahmad Yani No. 12, RT 05..." value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200 font-medium">
                ❌ Error: {errorMessage}
              </div>
            )}

            {shippingOptions.length > 0 && (
              <div className="mt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pilih Kurir Ekspedisi *</label>
                <select onChange={(e) => {
                  const found = shippingOptions.find(opt => opt.courierCode + opt.service === e.target.value);
                  if (found) setSelectedCourier(found);
                }} className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50 text-sm text-gray-800 font-medium shadow-sm">
                  {shippingOptions.map(opt => (
                    <option key={opt.courierCode + opt.service} value={opt.courierCode + opt.service}>
                      {opt.courierName} - Rp {opt.cost.toLocaleString('id-ID')} ({opt.etd})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3 mt-4 shadow-sm">
              <div className="flex justify-between text-sm text-gray-600 font-medium">
                <span>Subtotal ({currentQty} Pcs):</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 font-medium">
                <span>Ongkos Kirim:</span>
                <span>{isFreeShipping ? 'FREE (Samarinda)' : `Rp ${shippingCost.toLocaleString('id-ID')}`}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-emerald-600 border-t border-gray-200 pt-3">
                <span>Total Bayar:</span>
                <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button type="button" onClick={() => setStep(1)} className="w-1/3 bg-white border border-gray-300 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition text-sm shadow-sm">
                ← Kembali
              </button>
              <button type="button" disabled={!selectedCourier || !streetAddress} className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-md disabled:bg-gray-300 flex justify-center items-center gap-2">
                💳 Lanjut Bayar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
