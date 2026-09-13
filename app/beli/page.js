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

  // Form State
  const [orderQty, setOrderQty] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [storeName, setStoreName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  // Biteship Ongkir State
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

  // HANDLER CEK ONGKIR BITESHIP
  const handleCheckShipping = async () => {
    if (!destinationCity.trim()) {
      alert('Silakan ketik Kota/Kecamatan Tujuan terlebih dahulu.');
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
          destinationCityName: destinationCity,
          destinationPostalCode: postalCode,
          weightGrams: orderQty * 500,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Gagal menghitung ongkir.');

      if (data.isFreeShipping) {
        setShippingMessage('🎉 Selamat! Alamat Samarinda mendapatkan Gratis Ongkir.');
        setSelectedShipping({ cost: 0, courierName: 'Kurir Lokal Samarinda (Free)' });
      } else {
        setShippingMessage(`📍 Berhasil mengambil tarif ekspedisi. Silakan pilih kurir:`);
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

    const isSamarinda = destinationCity.toLowerCase().includes('samarinda');
    if (!selectedShipping && !isSamarinda) {
      alert('Silakan klik "Cek Tarif Ekspedisi" dan pilih kurir pengiriman terlebih dahulu.');
      return;
    }

    setIsCheckoutLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          shippingAddress,
          destinationCity,
          postalCode,
          courierName: selectedShipping?.courierName || 'Lokal Samarinda Free',
          shippingCost: selectedShipping?.cost || 0,
          storeName,
          targetUrl,
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
            ← Kembali ke Utama
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

            <h2 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: '800' }}>🛒 Order Papan Akrilik NFC</h2>

            <form onSubmit={handleProcessCheckout} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Nama Lengkap *</label>
                <input type="text" required placeholder="Contoh: Budi Santoso" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>No. WhatsApp *</label>
                <input type="tel" required placeholder="08xxxxxxxxxx" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Kota/Kecamatan *</label>
                  <input type="text" required placeholder="Contoh: Bandung" value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Kode Pos *</label>
                  <input type="text" required maxLength={5} placeholder="Contoh: 40111" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
              </div>

              <button type="button" onClick={handleCheckShipping} disabled={isCheckingShipping} style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                {isCheckingShipping ? 'Memeriksa Tarif Ekspedisi...' : '🔍 Cek Tarif Ekspedisi'}
              </button>

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

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Alamat Lengkap Pengiriman *</label>
                <textarea required placeholder="Jln. Ahmad Yani No. 12, Kel. Temindung Permai..." value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', height: '55px', fontFamily: 'inherit' }} />
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

              <button type="submit" disabled={isCheckoutLoading} style={{ width: '100%', padding: '16px', backgroundColor: isCheckoutLoading ? '#94a3b8' : '#16a34a', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: isCheckoutLoading ? 'not-allowed' : 'pointer', marginTop: '6px' }}>
                {isCheckoutLoading ? 'Memproses Transaksi...' : '💳 Lanjut Pembayaran (QRIS / VA)'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
