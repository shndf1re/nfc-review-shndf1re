'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BeliPage() {
  const [step, setStep] = useState(1);

  // === STEP 1: DATA PEMBELI ===
  const [buyerName, setBuyerName] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [qty, setQty] = useState(1);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  // === STEP 2: ALAMAT PENGIRIMAN ===
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [streetAddress, setStreetAddress] = useState('');

  // === SHIPPING RATES ===
  const [loadingOngkir, setLoadingOngkir] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFreeShipping, setIsFreeShipping] = useState(false);

  // === PERHITUNGAN BIAYA ===
  const itemPrice = 60000;
  // Jika qty kosong saat diketik, anggap 1 untuk perhitungan sementara agar tidak NaN
  const currentQty = Math.max(1, parseInt(qty, 10) || 1); 
  const subtotal = itemPrice * currentQty;
  const shippingCost = selectedCourier ? selectedCourier.cost : 0;
  const totalAmount = subtotal + shippingCost;

  // === FETCH API WILAYAH (EMSIFA) ===
  useEffect(() => {
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then((res) => res.json())
      .then((data) => setProvinces(data || []))
      .catch((err) => console.error('Gagal load provinsi:', err));
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

  // === FETCH API CEK ONGKIR BITESHIP ===
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
        setErrorMessage(data.error || 'Gagal mengambil ongkir.');
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

  // === VALIDASI LANJUT STEP 2 ===
  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (waNumber.length < 8) {
      alert('Nomor WhatsApp wajib diisi minimal 8 digit!');
      return;
    }
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-sm">
        
        {/* === HEADER & PROMO BANNER === */}
        <div className="pt-4 px-4 pb-2">
          <div className="flex justify-between items-center mb-3">
            <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 font-medium">
              ← Utama
            </Link>
            <div className="bg-red-100 text-red-600 font-bold px-3 py-1 rounded-full text-xs flex items-center">
              🔥 PROMO SPESIAL 60% OFF
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex justify-between items-center text-sm">
            <span className="font-semibold flex items-center gap-1">⏰ Promo Berakhir Dalam:</span>
            <span className="font-bold">14:28</span>
          </div>
        </div>

        {/* === STEPPER === */}
        <div className="flex items-center justify-center space-x-3 py-6 px-4">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 flex items-center justify-center rounded-full text-white text-sm font-bold ${step === 1 ? 'bg-emerald-500' : 'bg-emerald-500'}`}>1</div>
            <span className={`text-sm font-medium ${step === 1 ? 'text-gray-800' : 'text-gray-500'}`}>Data Pesanan</span>
          </div>
          <div className="w-8 border-t-2 border-gray-200"></div>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 flex items-center justify-center rounded-full text-white text-sm font-bold ${step === 2 ? 'bg-blue-600' : 'bg-gray-300'}`}>2</div>
            <span className={`text-sm font-medium ${step === 2 ? 'text-gray-800 font-bold' : 'text-gray-400'}`}>Alamat & Ongkir</span>
          </div>
        </div>

        {/* === KONTEN STEP 1 === */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="px-5 space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Langkah 1: Data Pemesan</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lengkap *</label>
              <input 
                type="text" 
                required 
                placeholder="Masukkan nama Anda" 
                value={buyerName} 
                onChange={(e) => setBuyerName(e.target.value)} 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nomor WhatsApp (Min. 8 Digit) *</label>
              <input 
                type="tel" 
                inputMode="numeric" 
                pattern="[0-9]*" 
                minLength={8} 
                required 
                placeholder="Contoh: 08123456789" 
                value={waNumber} 
                onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, ''))} // Cegah huruf diketik
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jumlah Pesanan (Pcs) *</label>
              <input 
                type="number" 
                min="1" 
                required 
                value={qty} 
                onChange={(e) => setQty(e.target.value)}
                onBlur={() => {
                  // Jika kosong/dihapus atau kurang dari 1, otomatis kembali ke 1
                  if (qty === '' || parseInt(qty, 10) < 1) {
                    setQty(1);
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Link Google Maps Usaha (Opsional)</label>
              <input 
                type="url" 
                placeholder="https://maps.google.com/..." 
                value={googleMapsUrl} 
                onChange={(e) => setGoogleMapsUrl(e.target.value)} 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition duration-200"
              >
                Lanjut ke Alamat ➔
              </button>
            </div>
          </form>
        )}

        {/* === KONTEN STEP 2 === */}
        {step === 2 && (
          <div className="px-5 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                📍 Langkah 2: Alamat Pengiriman
              </h2>
              <button 
                onClick={() => setStep(1)} 
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                ✏️ Edit Data Pembeli
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Provinsi Tujuan *</label>
              <select 
                onChange={handleProvinceChange} 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
              >
                <option value="">-- Pilih Provinsi --</option>
                {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kota / Kabupaten Tujuan *</label>
              <select 
                onChange={handleCityChange} 
                disabled={!regencies.length} 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400 text-sm"
              >
                <option value="">-- Pilih Kota / Kabupaten --</option>
                {regencies.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kecamatan Tujuan *</label>
              <select 
                onChange={handleDistrictChange} 
                disabled={!districts.length} 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400 text-sm"
              >
                <option value="">-- Pilih Kecamatan --</option>
                {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kode Pos *</label>
              <div className="flex gap-2">
                <input 
                  type="tel" 
                  inputMode="numeric" 
                  maxLength={5} 
                  placeholder="Contoh: 11210" 
                  value={postalCode} 
                  onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))} 
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" 
                />
                <button 
                  type="button" 
                  onClick={handleCekOngkir} 
                  disabled={loadingOngkir || !postalCode || !selectedCity} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl transition disabled:bg-gray-300 flex items-center justify-center gap-1 min-w-[120px]"
                >
                  {loadingOngkir ? 'Memuat...' : '🔍 Cek Ongkir'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alamat Jalan / Patokan *</label>
              <textarea 
                rows={2} 
                required 
                placeholder="Jln. Ahmad Yani No. 12, RT 05..." 
                value={streetAddress} 
                onChange={(e) => setStreetAddress(e.target.value)} 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" 
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200">
                ❌ Error: {errorMessage}
              </div>
            )}

            {/* Pilihan Kurir */}
            {shippingOptions.length > 0 && (
              <div className="mt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pilih Kurir Ekspedisi *</label>
                <select 
                  onChange={(e) => {
                    const found = shippingOptions.find(opt => opt.courierCode + opt.service === e.target.value);
                    if (found) setSelectedCourier(found);
                  }} 
                  className="w-full px-4 py-3.5 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50 text-sm font-medium text-gray-800"
                >
                  {shippingOptions.map(opt => (
                    <option key={opt.courierCode + opt.service} value={opt.courierCode + opt.service}>
                      {opt.courierName} - Rp {opt.cost.toLocaleString('id-ID')} ({opt.etd})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ringkasan Biaya */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3 mt-6 shadow-sm">
              <div className="flex justify-between text-sm text-gray-500 font-medium">
                <span>Subtotal ({currentQty} Pcs):</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 font-medium">
                <span>Ongkos Kirim:</span>
                <span>{isFreeShipping ? 'FREE (Lokal)' : `Rp ${shippingCost.toLocaleString('id-ID')}`}</span>
              </div>
              
              <div className="border-t border-dashed border-gray-300 pt-3 flex justify-between items-center font-bold text-lg">
                <span className="text-gray-800">Total Bayar:</span>
                <span className="text-emerald-600">Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Tombol Action Bawah */}
            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="w-1/3 bg-white border border-gray-300 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition text-sm"
              >
                ← Kembali
              </button>
              <button 
                type="button" 
                disabled={!selectedCourier || !streetAddress} 
                className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition disabled:bg-gray-300 flex justify-center items-center gap-2"
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
