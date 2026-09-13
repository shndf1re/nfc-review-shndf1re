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

  // State Order & Tracking Per-HP
  const [activeOrder, setActiveOrder] = useState(null);
  const [checkingOrder, setCheckingOrder] = useState(true);

  // State Form Pemesanan
  const [orderQty, setOrderQty] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [destinationCity, setDestinationCity] = useState('Samarinda');
  const [courier, setCourier] = useState('lokal');
  const [storeName, setStoreName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Timer Promo
  const [timeLeft, setTimeLeft] = useState((SITE_CONFIG.pricing?.timerMinutes || 15) * 60);

  const ORIGINAL_PRICE = SITE_CONFIG.pricing?.originalPrice || 150000;
  const DISCOUNT_PRICE = SITE_CONFIG.pricing?.discountPrice || 60000;
  const PROMO_TAG = SITE_CONFIG.pricing?.promoTag || '🔥 PROMO SPESIAL 60% OFF';

  const shippingCost = courier === 'lokal' ? 10000 : 25000;
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
        
        {/* TOP BAR BACK TO HOME */}
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

            <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '800' }}>🛒 Order Papan Akrilik NFC</h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>Pengiriman langsung dari Samarinda Ulu (75125).</p>

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
                  <input type="text" required placeholder="Samarinda" value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Kurir/Ongkir *</label>
                  <select value={courier} onChange={(e) => setCourier(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff' }}>
                    <option value="lokal">Lokal Samarinda (Rp 10.000)</option>
                    <option value="ekspedisi">Luar Kota / JNE J&T (Rp 25.000)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Alamat Lengkap *</label>
                <textarea required placeholder="Jln. Ahmad Yani No. 12, Samarinda..." value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', height: '60px', fontFamily: 'inherit' }} />
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

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                  <span>Harga Akrilik ({orderQty} Pcs):</span>
                  <span>Rp {totalItemsPrice.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                  <span>Ongkos Kirim:</span>
                  <span>Rp {shippingCost.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: '#0f172a', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                  <span>Total Tagihan:</span>
                  <span style={{ color: '#16a34a', fontSize: '18px' }}>Rp {grandTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {orderError && <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', fontWeight: '600', textAlign: 'center' }}>{orderError}</p>}

              <button type="submit" disabled={isCheckoutLoading} style={{ width: '100%', padding: '16px', backgroundColor: isCheckoutLoading ? '#94a3b8' : '#16a34a', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: isCheckoutLoading ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
                {isCheckoutLoading ? 'Memproses Transaksi...' : '💳 Lanjut Pembayaran (QRIS / VA)'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
