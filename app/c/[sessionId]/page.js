'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Package, Timer, Flame, User, Phone, Hash, MapPin, Truck, Ticket, CreditCard, CheckCircle2,
  Receipt, Search, Pencil, AlertCircle, ShieldCheck, Lock, Loader2, Nfc, Minus, Plus, Map as MapIcon,
} from 'lucide-react';
import { Field, TextInput, SelectInput, Btn, Modal, formatRupiah } from '@/components/admin/kit';
import { cn } from '@/lib/utils';

export default function DynamicCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  // === MODAL SUCCESS & REDIRECT STATE ===
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrderDetails, setSuccessOrderDetails] = useState({
    orderId: '',
    checkoutUrl: '', // Tambahan state untuk menyimpan URL Tripay
    name: '',
    total: 0,
    qty: 1
  });

  // === VALIDASI ROUTE OBFUSCATION (URL UNIK) ===
  useEffect(() => {
    setIsMounted(true);

    const currentUrlSession = params?.sessionId;
    const savedSession = localStorage.getItem('active_checkout_session');

    if (currentUrlSession && savedSession && currentUrlSession === savedSession) {
      setIsValidSession(true);
    } else {
      router.replace('/');
    }
  }, [params, router]);

  // === HARGA RESMI & PROMO ===
  const ORIGINAL_PRICE_PER_ITEM = 100000; // Harga Normal per Pcs
  const BASE_PROMO_PRICE = 50000;        // Harga Promo per Pcs

  const [timeLeft, setTimeLeft] = useState('30:00');
  const [isExpired, setIsExpired] = useState(false);
  const [itemPrice, setItemPrice] = useState(BASE_PROMO_PRICE);

  // === STATE KODE PROMO (KUPON) ===
  const [couponInput, setCouponInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [appliedCode, setAppliedCode] = useState('');

  useEffect(() => {
    if (!isValidSession) return;

    let endTime = localStorage.getItem('promo_end_time_30m');

    if (!endTime) {
      endTime = Date.now() + 30 * 60 * 1000;
      localStorage.setItem('promo_end_time_30m', endTime.toString());
    } else {
      endTime = parseInt(endTime, 10);
    }

    const timerInterval = setInterval(() => {
      const now = Date.now();
      const distance = endTime - now;

      if (distance <= 0) {
        clearInterval(timerInterval);
        setTimeLeft('00:00');
        setIsExpired(true);
        setItemPrice(ORIGINAL_PRICE_PER_ITEM);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const formattedMin = minutes < 10 ? `0${minutes}` : minutes;
        const formattedSec = seconds < 10 ? `0${seconds}` : seconds;

        setTimeLeft(`${formattedMin}:${formattedSec}`);
        setIsExpired(false);
        setItemPrice(BASE_PROMO_PRICE);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isValidSession]);

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
  const [formError, setFormError] = useState('');

  const currentQty = Math.max(1, parseInt(qty, 10) || 1);
  const rawSubtotal = itemPrice * currentQty;
  const finalSubtotal = Math.max(0, rawSubtotal - appliedDiscount);
  const shippingCost = selectedCourier ? selectedCourier.cost : 0;
  const totalAmount = finalSubtotal + shippingCost;

  // FUNGSI CEK & GUNAKAN KODE PROMO
  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) return;

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput })
      });

      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'Kode promo tidak valid.');
        setAppliedDiscount(0);
        setAppliedCode('');
      } else {
        setAppliedDiscount(data.discountAmount);
        setAppliedCode(data.code);
        setCouponError('');
      }
    } catch (err) {
      setCouponError('Gagal memverifikasi kode promo.');
    }
  };

  // === LOAD PROVINSI EMSIFA V2 ===
  useEffect(() => {
    if (!isValidSession) return;
    fetch('https://www.emsifa.com/api-wilayah-indonesia/v2/provinces.json')
      .then((res) => res.json())
      .then((json) => setProvinces(json.data || []))
      .catch((err) => console.error('Gagal load provinsi:', err));
  }, [isValidSession]);

  const handleProvinceChange = (e) => {
    const provId = e.target.value;
    setSelectedProvinceId(provId);
    
    const provObj = provinces.find((p) => p.id === provId);
    setSelectedProvinceName(provObj ? provObj.name : '');

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

  const handleRegencyChange = (e) => {
    const regId = e.target.value;
    setSelectedRegencyId(regId);
    
    const regObj = regencies.find((r) => r.id === regId);
    setSelectedRegencyName(regObj ? regObj.name : '');

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

  const handleDistrictChange = (e) => {
    const distId = e.target.value;
    setSelectedDistrictId(distId);
    
    const distObj = districts.find((d) => d.id === distId);
    setSelectedDistrictName(distObj ? distObj.name : '');

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
      setFormError('Nomor WhatsApp wajib diisi minimal 8 digit.');
      return;
    }
    setFormError('');
    setStep(2);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // === HANDLER PEMBAYARAN TRIPAY ===
  const handlePay = async () => {
    if (!selectedCourier || !streetAddress) {
      setFormError('Lengkapi alamat dan pilih kurir terlebih dahulu.');
      return;
    }

    setFormError('');
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
          isExpiredPromo: isExpired,
          discountAmount: appliedDiscount
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.checkoutUrl) {
        setFormError(data.error || 'Gagal membuat transaksi pembayaran.');
        setLoadingPay(false);
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('last_customer_phone', waNumber);
        if (data.orderId) {
          localStorage.setItem('last_order_id', data.orderId);
        }
        
        // PESAN SUKSES & MUNCULKAN MODAL KONFIRMASI MODERN
        setSuccessOrderDetails({
          orderId: data.orderId,
          checkoutUrl: data.checkoutUrl, // Simpan Link Tripay
          name: buyerName,
          total: totalAmount,
          qty: currentQty
        });
        setLoadingPay(false);
        setShowSuccessModal(true);
      }

    } catch (err) {
      setFormError('Terjadi kesalahan koneksi: ' + err.message);
      setLoadingPay(false);
    }
  };

  if (!isMounted || !isValidSession) return null;

  const canPay = Boolean(selectedCourier && streetAddress && !loadingPay);
  const savings = !isExpired ? (ORIGINAL_PRICE_PER_ITEM - itemPrice) * currentQty : 0;

  const SummaryCard = ({ compact }) => (
    <div className={cn('rounded-2xl border border-border bg-card shadow-sm', compact ? 'p-4' : 'p-5')} data-testid="order-summary">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          <img src="/galeri-1.jpg" alt="Papan Akrilik NFC" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">Papan Akrilik Google Review NFC + QR</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs">
            {!isExpired && <span className="text-muted-foreground line-through">{formatRupiah(ORIGINAL_PRICE_PER_ITEM)}</span>}
            <span className="font-semibold text-primary">{formatRupiah(itemPrice)}</span>
            <span className="text-muted-foreground">× {currentQty}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2 border-t border-dashed border-border pt-4 text-sm">
        <div className="flex justify-between text-muted-foreground"><span>Subtotal ({currentQty} pcs)</span><span className="font-medium text-foreground">{formatRupiah(rawSubtotal)}</span></div>
        {savings > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Hemat promo</span><span className="font-medium">- {formatRupiah(savings)}</span></div>}
        {appliedDiscount > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Kode promo ({appliedCode})</span><span className="font-medium">- {formatRupiah(appliedDiscount)}</span></div>}
        <div className="flex justify-between text-muted-foreground">
          <span>Ongkos kirim</span>
          <span className="font-medium text-foreground">{selectedCourier ? (isFreeShipping ? 'GRATIS (Samarinda)' : formatRupiah(shippingCost)) : '—'}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="font-semibold">Total Bayar</span>
          <span className="text-lg font-bold tabular-nums text-primary" data-testid="total-amount">{formatRupiah(totalAmount)}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" /> Pembayaran aman via Tripay · QRIS, VA & e-wallet
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 via-violet-500/5 to-transparent" />

      {/* NAV */}
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <a href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Beranda</a>
          <div className="flex items-center gap-1.5 text-sm font-semibold"><Lock className="h-3.5 w-3.5 text-emerald-500" /> Checkout Aman</div>
          <a href="/track" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold shadow-sm hover:bg-accent"><Package className="h-3.5 w-3.5" /> Lacak</a>
        </div>
      </nav>

      <div className="relative mx-auto max-w-5xl px-4 py-5 sm:py-8">
        {/* PROMO TIMER */}
        <div
          data-testid="promo-timer"
          className={cn('mb-5 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3',
            isExpired ? 'border-border bg-muted/60 text-muted-foreground' : 'border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 text-rose-700 dark:border-rose-500/30 dark:from-rose-500/10 dark:to-orange-500/10 dark:text-rose-300')}
        >
          <div className="flex items-center gap-2.5">
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', isExpired ? 'bg-card' : 'bg-rose-500 text-white shadow-md shadow-rose-500/30')}>
              {isExpired ? <Timer className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
            </span>
            <div>
              <div className="text-sm font-semibold">{isExpired ? 'Waktu promo habis' : 'Promo spesial 50% OFF'}</div>
              <div className="text-[11px] opacity-80">{isExpired ? 'Harga kembali normal' : 'Harga promo berakhir dalam'}</div>
            </div>
          </div>
          <div className="rounded-xl bg-card px-3 py-1.5 font-mono text-lg font-bold tabular-nums shadow-sm ring-1 ring-border">{timeLeft}</div>
        </div>

        <div className="grid gap-5 lg:grid-cols-5 lg:items-start">
          {/* FORM */}
          <div className="min-w-0 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:col-span-3">
            {/* Stepper */}
            <ol className="mb-6 flex items-center gap-3" data-testid="checkout-stepper">
              {[{ n: 1, l: 'Data Pesanan' }, { n: 2, l: 'Alamat & Ongkir' }].map((st, i) => (
                <li key={st.n} className="flex flex-1 items-center gap-2 min-w-0">
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    step > st.n ? 'bg-emerald-500 text-white' : step === st.n ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30' : 'bg-muted text-muted-foreground')}>
                    {step > st.n ? <CheckCircle2 className="h-4 w-4" /> : st.n}
                  </span>
                  <span className={cn('truncate text-sm font-semibold', step === st.n ? 'text-foreground' : 'text-muted-foreground')}>{st.l}</span>
                  {i === 0 && <span className={cn('h-px flex-1', step > 1 ? 'bg-emerald-400' : 'bg-border')} />}
                </li>
              ))}
            </ol>

            {step === 1 && (
              <form onSubmit={handleNextStep1} className="space-y-4" data-testid="checkout-step1">
                <div>
                  <h1 className="text-lg font-bold tracking-tight">Data Pemesan</h1>
                  <p className="text-sm text-muted-foreground">Info pesanan & konfirmasi dikirim ke WhatsApp Anda.</p>
                </div>
                <Field label="Nama Lengkap *">
                  <div className="relative"><User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <TextInput data-testid="co-name" required className="h-11 pl-9" placeholder="Masukkan nama Anda" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} /></div>
                </Field>
                <Field label="Nomor WhatsApp *" hint="Minimal 8 digit, contoh 08123456789">
                  <div className="relative"><Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <TextInput data-testid="co-wa" type="tel" inputMode="numeric" pattern="[0-9]*" minLength={8} required className="h-11 pl-9" placeholder="08123456789" value={waNumber} onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, ''))} /></div>
                </Field>
                <Field label="Jumlah Pesanan *">
                  <div className="flex h-11 w-40 items-center overflow-hidden rounded-lg border border-input bg-card shadow-sm">
                    <button type="button" data-testid="co-qty-minus" onClick={() => setQty(Math.max(1, currentQty - 1))} className="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"><Minus className="h-4 w-4" /></button>
                    <input data-testid="co-qty" type="number" min="1" required value={qty} onChange={(e) => setQty(e.target.value)} onBlur={() => { if (qty === '' || parseInt(qty, 10) < 1) setQty(1); }} className="h-full w-full flex-1 bg-transparent text-center text-base font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                    <button type="button" data-testid="co-qty-plus" onClick={() => setQty(currentQty + 1)} className="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"><Plus className="h-4 w-4" /></button>
                  </div>
                </Field>
                <Field label="Link Google Maps Usaha (opsional)" hint="Agar kami bisa bantu siapkan link review toko Anda.">
                  <div className="relative"><MapIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <TextInput type="url" className="h-11 pl-9" placeholder="https://maps.google.com/..." value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} /></div>
                </Field>
                {formError && <p data-testid="co-error" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}</p>}
                <Btn data-testid="co-next" type="submit" variant="gradient" size="lg" className="w-full">Lanjut ke Alamat <ArrowRight /></Btn>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-4" data-testid="checkout-step2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-lg font-bold tracking-tight">Alamat Pengiriman</h1>
                    <p className="text-sm text-muted-foreground">Pilih wilayah, lalu cek ongkir.</p>
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => setStep(1)}><Pencil /> Edit Data</Btn>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-xs">
                  <User className="h-4 w-4 text-primary" />
                  <span className="min-w-0 truncate"><b className="text-foreground">{buyerName}</b> · {waNumber} · {currentQty} pcs</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Provinsi *">
                    <SelectInput data-testid="co-province" className="h-11" value={selectedProvinceId} onChange={handleProvinceChange}>
                      <option value="">Pilih provinsi</option>
                      {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </SelectInput>
                  </Field>
                  <Field label="Kota / Kabupaten *">
                    <SelectInput data-testid="co-regency" className="h-11" value={selectedRegencyId} onChange={handleRegencyChange} disabled={!regencies.length}>
                      <option value="">Pilih kota / kabupaten</option>
                      {regencies.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </SelectInput>
                  </Field>
                  <Field label="Kecamatan *">
                    <SelectInput data-testid="co-district" className="h-11" value={selectedDistrictId} onChange={handleDistrictChange} disabled={!districts.length}>
                      <option value="">Pilih kecamatan</option>
                      {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </SelectInput>
                  </Field>
                  <Field label="Kelurahan / Desa *">
                    <SelectInput data-testid="co-village" className="h-11" value={selectedVillageName} onChange={handleVillageChange} disabled={!villages.length}>
                      <option value="">Pilih kelurahan</option>
                      {villages.map((v) => <option key={v.id} value={v.name}>{v.name}{v.postal_code ? ` (${v.postal_code})` : ''}</option>)}
                    </SelectInput>
                  </Field>
                </div>

                <Field label="Kode Pos *">
                  <div className="flex gap-2">
                    <div className="relative flex-1"><Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <TextInput readOnly className="h-11 bg-muted/60 pl-9 font-semibold" placeholder="Otomatis dari kelurahan" value={postalCode} /></div>
                    <Btn data-testid="co-cek-ongkir" type="button" size="lg" onClick={handleCekOngkir} loading={loadingOngkir} disabled={!postalCode || !selectedRegencyName}>{!loadingOngkir && <Search />} Cek Ongkir</Btn>
                  </div>
                </Field>

                <Field label="Alamat Jalan / Patokan *">
                  <textarea data-testid="co-address" rows={2} required placeholder="Jln. Ahmad Yani No. 12, RT 05, dekat masjid..." value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:text-sm" />
                </Field>

                {errorMessage && <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMessage}</p>}

                {shippingOptions.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium"><Truck className="h-3.5 w-3.5 text-primary" /> Pilih Kurir *</div>
                    <div className="space-y-2" data-testid="co-couriers">
                      {shippingOptions.map((opt) => {
                        const key = opt.courierCode + opt.service;
                        const active = selectedCourier && selectedCourier.courierCode + selectedCourier.service === key;
                        return (
                          <button type="button" key={key} onClick={() => setSelectedCourier(opt)}
                            className={cn('flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all',
                              active ? 'border-primary bg-primary/[0.06] ring-2 ring-primary/20' : 'border-border bg-card hover:border-primary/40')}>
                            <div className="flex items-center gap-3">
                              <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border-2', active ? 'border-primary' : 'border-muted-foreground/40')}>{active && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                              <div>
                                <div className="text-sm font-semibold">{opt.courierName}</div>
                                {opt.etd && <div className="text-[11px] text-muted-foreground">Estimasi {opt.etd}</div>}
                              </div>
                            </div>
                            <span className="text-sm font-bold tabular-nums">{opt.cost === 0 ? 'GRATIS' : formatRupiah(opt.cost)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* KUPON */}
                <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-4 dark:border-violet-500/30 dark:bg-violet-500/5">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold"><Ticket className="h-4 w-4 text-violet-500" /> Punya kode promo?</div>
                  <div className="flex gap-2">
                    <TextInput data-testid="co-coupon" placeholder="Masukkan kode" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="font-mono uppercase" />
                    <Btn data-testid="co-coupon-apply" type="button" variant="outline" onClick={handleApplyCoupon}>Gunakan</Btn>
                  </div>
                  {couponError && <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{couponError}</p>}
                  {appliedDiscount > 0 && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Potongan {formatRupiah(appliedDiscount)} ({appliedCode}) diterapkan</p>}
                </div>

                {/* Ringkasan (HP) */}
                <div className="lg:hidden"><SummaryCard compact /></div>

                {formError && <p data-testid="co-error" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}</p>}

                <div className="flex gap-2 pt-1">
                  <Btn type="button" variant="outline" size="lg" onClick={() => setStep(1)}><ArrowLeft /> Kembali</Btn>
                  <Btn data-testid="co-pay" type="button" variant="success" size="lg" className="flex-1" onClick={handlePay} disabled={!canPay} loading={loadingPay}>
                    {!loadingPay && <CreditCard />} {loadingPay ? 'Memproses...' : `Bayar ${formatRupiah(totalAmount)}`}
                  </Btn>
                </div>
              </div>
            )}
          </div>

          {/* SUMMARY (desktop / step 1 HP) */}
          <aside className={cn('min-w-0 space-y-3 lg:sticky lg:top-20 lg:col-span-2', step === 2 && 'hidden lg:block')}>
            <SummaryCard />
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
              <div className="rounded-xl border border-border bg-card p-2.5"><Nfc className="mx-auto mb-1 h-4 w-4 text-primary" />Chip NFC + QR</div>
              <div className="rounded-xl border border-border bg-card p-2.5"><ShieldCheck className="mx-auto mb-1 h-4 w-4 text-emerald-500" />Garansi chip</div>
              <div className="rounded-xl border border-border bg-card p-2.5"><Truck className="mx-auto mb-1 h-4 w-4 text-amber-500" />Kirim 1–3 hari</div>
            </div>
          </aside>
        </div>
      </div>

      {/* MODAL PESANAN DIBUAT */}
      <Modal open={showSuccessModal} onClose={() => setShowSuccessModal(false)} icon={Receipt} tone="emerald" title="Pesanan Berhasil Dibuat!" description="Data pesanan Anda tersimpan. Lanjutkan pembayaran untuk memproses pesanan." testId="co-success-modal">
        <div className="space-y-2 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Order ID</span><b className="font-mono">{successOrderDetails.orderId}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Pemesan</span><b>{successOrderDetails.name}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Jumlah</span><b>{successOrderDetails.qty} pcs</b></div>
          <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Total Tagihan</span><b className="text-primary">{formatRupiah(successOrderDetails.total)}</b></div>
        </div>
        <div className="mt-5 space-y-2">
          <Btn data-testid="co-pay-now" variant="success" size="lg" className="w-full" onClick={() => { window.location.href = successOrderDetails.checkoutUrl; }}><CreditCard /> Bayar Sekarang</Btn>
          <Btn variant="outline" size="lg" className="w-full" onClick={() => { window.location.href = '/track'; }}><Package /> Nanti Saja / Cek Status Pesanan</Btn>
        </div>
      </Modal>
    </div>
  );
}
