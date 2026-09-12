'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Inter } from 'next/font/google';
import { SITE_CONFIG } from '../lib/config';

const inter = Inter({ subsets: ['latin'] });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function LandingPage() {
  const router = useRouter();
  const waUrl = `https://wa.me/${SITE_CONFIG.supportWhatsapp}?text=${encodeURIComponent(SITE_CONFIG.waPromoText)}`;

  // State Navigasi & Modal Aktivasi
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [cardIdInput, setCardIdInput] = useState('');
  const [cardPinInput, setCardPinInput] = useState('');
  const [activateError, setActivateError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // State Order & Tracking Per-HP
  const [activeOrder, setActiveOrder] = useState(null);
  const [checkingOrder, setCheckingOrder] = useState(true);

  // State Modal Form Pemesanan
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderQty, setOrderQty] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [destinationCity, setDestinationCity] = useState('Samarinda');
  const [courier, setCourier] = useState('lokal'); // 'lokal' atau 'ekspedisi'
  const [storeName, setStoreName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Timer Hitung Mundur Promo
  const [timeLeft, setTimeLeft] = useState((SITE_CONFIG.pricing?.timerMinutes || 15) * 60);

  const ORIGINAL_PRICE = SITE_CONFIG.pricing?.originalPrice || 150000;
  const DISCOUNT_PRICE = SITE_CONFIG.pricing?.discountPrice || 60000;
  const PROMO_TAG = SITE_CONFIG.pricing?.promoTag || '🔥 PROMO SPESIAL 60% OFF';

  // Kalkulasi Ongkir (Asal Samarinda Ulu 75125)
  const shippingCost = courier === 'lokal' ? 10000 : 25000;
  const totalItemsPrice = orderQty * DISCOUNT_PRICE;
  const grandTotal = totalItemsPrice + shippingCost;

  // 1. CEK TRACKING ORDER DI MEMORI HP (LOCALSTORAGE)
  useEffect(() => {
    checkSavedOrder();
  }, []);

  useEffect(() => {
    if (!showOrderModal) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [showOrderModal]);

  const checkSavedOrder = async () => {
    try {
      setCheckingOrder(true);
      const savedOrderId = localStorage.getItem('active_nfc_order_id');
      if (savedOrderId) {
        const { data, error } = await supabase
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

  // HANDLER BATALKAN PESANAN
  const handleCancelOrder = async () => {
    if (!activeOrder) return;
    if (!confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) return;

    try {
      const res = await fetch('/api/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: activeOrder.order_id }),
      });

      if (res.ok) {
        localStorage.removeItem('active_nfc_order_id');
        setActiveOrder(null);
        alert('Pesanan berhasil dibatalkan. Anda sekarang bisa membuat pesanan baru.');
      }
    } catch (err) {
      alert('Gagal membatalkan pesanan.');
    }
  };

  // HANDLER BAYAR ULANG (BUKA SNAP MIDTRANS)
  const handlePayExistingOrder = () => {
    if (!activeOrder || !activeOrder.snap_token) return;
    if (window.snap) {
      window.snap.pay(activeOrder.snap_token, {
        onSuccess: function () {
          localStorage.removeItem('active_nfc_order_id');
          setActiveOrder(null);
          alert('🎉 Pembayaran Berhasil! Tim kami akan segera mengirimkan pesanan Anda.');
        },
        onPending: function () {
          alert('⏳ Menunggu Pembayaran. Silakan selesaikan transaksi sesuai petunjuk.');
        },
        onError: function () {
          alert('❌ Pembayaran Gagal.');
        },
      });
    }
  };

  // HANDLER CHECKOUT BARU
  const handleProcessCheckout = async (e) => {
    e.preventDefault();
    setOrderError('');
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
          courier: courier === 'lokal' ? 'Kurir Lokal Samarinda' : 'Ekspedisi (JNE/J&T/POS)',
          shippingCost,
          storeName,
          targetUrl,
          qty: orderQty,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal memproses transaksi.');
      }

      // Simpan Order ID di LocalStorage HP Pembeli
      localStorage.setItem('active_nfc_order_id', data.orderId);

      if (window.snap && data.token) {
        setShowOrderModal(false);
        window.snap.pay(data.token, {
          onSuccess: function () {
            localStorage.removeItem('active_nfc_order_id');
            setActiveOrder(null);
            alert('🎉 Pembayaran Berhasil! Tim kami akan segera memproses pesanan Anda.');
          },
          onPending: function () {
            checkSavedOrder();
            alert('⏳ Pesanan disimpan! Silakan selesaikan pembayaran.');
          },
          onError: function () {
            alert('❌ Pembayaran Gagal.');
          },
          onClose: function () {
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

  // HANDLER VERIFIKASI AKTIVASI
  const handleVerifyAndRedirect = async (e) => {
    e.preventDefault();
    setActivateError('');
    setVerifying(true);

    const cleanId = cardIdInput.trim();
    const cleanPin = cardPinInput.trim();

    if (!cleanId || !cleanPin) {
      setActivateError('ID Kartu dan PIN wajib diisi.');
      setVerifying(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('id, pin')
        .eq('id', cleanId)
        .maybeSingle();

      if (error || !data) {
        setActivateError('ID Kartu tidak ditemukan.');
      } else if (String(data.pin).trim() !== cleanPin) {
        setActivateError('PIN Kartu salah.');
      } else {
        setShowActivateModal(false);
        router.push(`/setup/${cleanId}`);
      }
    } catch (err) {
      setActivateError('Terjadi kesalahan jaringan.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={inter.className} style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. NAVBAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/app-icon.png" alt="App Logo" style={{ width: '38px', height: '38px', borderRadius: '12px', objectFit: 'cover' }} />
            <span style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
              {SITE_CONFIG.brandName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setShowOrderModal(true)} style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', backgroundColor: '#16a34a', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer' }}>
              🛒 Beli Akrilik
            </button>
            <button onClick={() => setShowActivateModal(true)} style={{ fontSize: '14px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer' }}>
              🚀 Aktivasi Papan
            </button>
            <button onClick={() => setSidebarOpen(true)} style={{ fontSize: '18px', fontWeight: '800', backgroundColor: 'transparent', border: 'none', padding: '8px', cursor: 'pointer' }}>
              ☰
            </button>
          </div>
        </div>
      </nav>

      {/* TRACKING BAR BANNER (PER-HP UNTUK ORDERAN BELUM DIBAYAR) */}
      {!checkingOrder && activeOrder && (
        <div style={{ backgroundColor: '#fffbe6', borderBottom: '1px solid #ffe58f', padding: '12px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '13px', color: '#d48806', fontWeight: '600' }}>
              ⏳ Anda memiliki pesanan pending <strong>({activeOrder.order_id})</strong> senilai <strong>Rp {Number(activeOrder.total_price).toLocaleString('id-ID')}</strong>.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handlePayExistingOrder} style={{ padding: '6px 14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                💳 Bayar Sekarang
              </button>
              <button onClick={handleCancelOrder} style={{ padding: '6px 14px', backgroundColor: '#ffffff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                Batalkan Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '300px', backgroundColor: '#ffffff', height: '100%', padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <span style={{ fontSize: '16px', fontWeight: '800' }}>Menu Navigasi</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => { setSidebarOpen(false); setShowOrderModal(true); }} style={{ textAlign: 'left', padding: '16px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                🛒 Pesan Akrilik Baru
              </button>
              <button onClick={() => { setSidebarOpen(false); setShowActivateModal(true); }} style={{ textAlign: 'left', padding: '16px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                🚀 Aktivasi Kartu NFC
              </button>
              <Link href="/admin" onClick={() => setSidebarOpen(false)} style={{ padding: '16px', backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                🔑 Login Admin Portal
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEMESANAN & CEK ONGKIR */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px 24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {activeOrder ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <span style={{ fontSize: '36px' }}>⚠️</span>
                <h3 style={{ margin: '12px 0 6px 0', fontSize: '18px', fontWeight: '800' }}>Ada Pesanan Belum Dibayar</h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                  HP Anda terdeteksi memiliki transaksi aktif <strong>({activeOrder.order_id})</strong>. Selesaikan pembayaran atau batalkan pesanan tersebut sebelum membuat order baru.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => { setShowOrderModal(false); handlePayExistingOrder(); }} style={{ width: '100%', padding: '14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                    💳 Lanjutkan Pembayaran (Rp {Number(activeOrder.total_price).toLocaleString('id-ID')})
                  </button>
                  <button onClick={() => { setShowOrderModal(false); handleCancelOrder(); }} style={{ width: '100%', padding: '12px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '12px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                    🗑️ Batalkan Pesanan Lama
                  </button>
                  <button onClick={() => setShowOrderModal(false)} style={{ border: 'none', backgroundColor: 'transparent', color: '#64748b', fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}>
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626' }}>⏰ Promo Berakhir Dalam:</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#b91c1c', fontFamily: 'monospace' }}>{formatTimer(timeLeft)}</span>
                </div>

                <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>🛍️ Formulir Pemesanan Akrilik</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>Pengiriman langsung dari Samarinda Ulu (75125).</p>

                <form onSubmit={handleProcessCheckout} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Nama Lengkap Pembeli *</label>
                    <input type="text" required placeholder="Contoh: Budi Santoso" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>No. WhatsApp *</label>
                    <input type="tel" required placeholder="08xxxxxxxxxx" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Kota/Kecamatan *</label>
                      <input type="text" required placeholder="Samarinda" value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Pilih Kurir/Ongkir *</label>
                      <select value={courier} onChange={(e) => setCourier(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', backgroundColor: '#fff' }}>
                        <option value="lokal">Lokal Samarinda (Rp 10.000)</option>
                        <option value="ekspedisi">Luar Kota / JNE J&T (Rp 25.000)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Alamat Lengkap Pengiriman *</label>
                    <textarea required placeholder="Jln. Ahmad Yani No. 12, Samarinda..." value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', height: '50px', fontFamily: 'inherit' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Nama Toko (Opsional)</label>
                      <input type="text" placeholder="Kopi Sedap" value={storeName} onChange={(e) => setStoreName(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Jumlah (Pcs)</label>
                      <input type="number" min="1" max="50" required value={orderQty} onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                  </div>

                  {/* RINCIAN PERHITUNGAN (PROMO + ONGKIR) */}
                  <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      <span>Subtotal ({orderQty} Pcs):</span>
                      <span>Rp {totalItemsPrice.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                      <span>Ongkos Kirim ({courier === 'lokal' ? 'Lokal' : 'Ekspedisi'}):</span>
                      <span>Rp {shippingCost.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', color: '#0f172a', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                      <span>Total Tagihan:</span>
                      <span style={{ color: '#16a34a', fontSize: '17px' }}>Rp {grandTotal.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {orderError && <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', fontWeight: '600', textAlign: 'center' }}>{orderError}</p>}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button type="button" onClick={() => setShowOrderModal(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                    <button type="submit" disabled={isCheckoutLoading} style={{ flex: 2, padding: '12px', backgroundColor: isCheckoutLoading ? '#94a3b8' : '#16a34a', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: isCheckoutLoading ? 'not-allowed' : 'pointer' }}>
                      {isCheckoutLoading ? 'Memproses...' : '💳 Bayar Sekarang'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL AKTIVASI */}
      {showActivateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>🚀</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Mulai Aktivasi Papan</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b' }}>Masukkan ID Kartu dan PIN Akses Anda.</p>
            <form onSubmit={handleVerifyAndRedirect} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" required placeholder="ID Kartu (contoh: NFC-xxxx)" value={cardIdInput} onChange={(e) => setCardIdInput(e.target.value)} style={{ width: '100%', padding: '16px', fontSize: '14px', borderRadius: '14px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '600', boxSizing: 'border-box' }} />
              <input type="password" required maxLength={6} placeholder="PIN 6-Digit" value={cardPinInput} onChange={(e) => setCardPinInput(e.target.value)} style={{ width: '100%', padding: '16px', fontSize: '20px', textAlign: 'center', letterSpacing: '8px', borderRadius: '14px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              {activateError && <p style={{ margin: '0', fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>{activateError}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowActivateModal(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={verifying} style={{ flex: 1, padding: '14px', backgroundColor: verifying ? '#94a3b8' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: verifying ? 'not-allowed' : 'pointer' }}>
                  {verifying ? 'Memeriksa...' : 'Lanjut Setup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section style={{ padding: '80px 24px 60px 24px', textAlign: 'center', maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '13px', fontWeight: '800', borderRadius: '24px', marginBottom: '24px', border: '1px solid #fecaca' }}>
          {PROMO_TAG}
        </div>
        <h1 style={{ fontSize: '46px', fontWeight: '800', lineHeight: '1.15', margin: '0 0 20px 0', color: '#0f172a' }}>
          Tingkatkan Reputasi Bisnis Anda Dengan <span style={{ color: '#2563eb' }}>Sekali Sentuh</span>
        </h1>
        <p style={{ fontSize: '17px', color: '#475569', lineHeight: '1.6', margin: '0 auto 28px auto', maxWidth: '650px' }}>
          Kumpulkan ulasan Bintang 5 di Google Maps 10x lebih cepat. Pelanggan cukup tap HP ke papan pintar kami tanpa perlu mengetik nama toko Anda.
        </p>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', backgroundColor: '#ffffff', padding: '12px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
          <span style={{ fontSize: '16px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: '600' }}>Rp {ORIGINAL_PRICE.toLocaleString('id-ID')}</span>
          <span style={{ fontSize: '26px', color: '#16a34a', fontWeight: '900' }}>Rp {DISCOUNT_PRICE.toLocaleString('id-ID')}</span>
          <span style={{ fontSize: '11px', color: '#dc2626', backgroundColor: '#fee2e2', fontWeight: '700', padding: '2px 8px', borderRadius: '6px' }}>HEMAT 60%</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowOrderModal(true)} style={{ padding: '16px 32px', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '14px', boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.4)', cursor: 'pointer', minWidth: '200px' }}>
            🛒 Pesan via Website (QRIS/VA)
          </button>
          <a href={waUrl} target="_blank" rel="noreferrer" style={{ padding: '16px 32px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: '600', fontSize: '15px', textDecoration: 'none', borderRadius: '14px', border: '1px solid #cbd5e1', minWidth: '200px' }}>
            💬 Konsultasi WA
          </a>
        </div>
      </section>

      {/* FLOATING WA BUTTON */}
      <a href={waUrl} target="_blank" rel="noreferrer" style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#25d366', color: '#ffffff', borderRadius: '50px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(37, 211, 102, 0.4)', textDecoration: 'none', fontWeight: '700', fontSize: '14px', zIndex: 999 }}>
        <span style={{ fontSize: '20px' }}>💬</span>
        <span>Chat CS</span>
      </a>
    </div>
  );
}
