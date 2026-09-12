'use client';

import { useState } from 'react';
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

  // State Modal Navigasi & Aktivasi
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [cardIdInput, setCardIdInput] = useState('');
  const [cardPinInput, setCardPinInput] = useState('');
  const [activateError, setActivateError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // State Modal Pemesanan & Pembayaran Midtrans
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderQty, setOrderQty] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [storeName, setStoreName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [orderError, setOrderError] = useState('');

  const PRICE_PER_ITEM = 150000;

  // Handler Aktivasi Kartu
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
        setActivateError('ID Kartu tidak ditemukan di sistem.');
      } else if (String(data.pin).trim() !== cleanPin) {
        setActivateError('PIN Kartu salah. Periksa kembali pesan WA Anda.');
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

  // Handler Proses Checkout Midtrans (QRIS & VA)
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
          storeName,
          targetUrl,
          qty: orderQty,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal memproses transaksi.');
      }

      // Panggil Pop-up Midtrans Snap jika SDK berhasil di-load
      if (window.snap && data.token) {
        setShowOrderModal(false);
        window.snap.pay(data.token, {
          onSuccess: function (result) {
            alert('🎉 Pembayaran Berhasil! Tim kami akan segera memproses pesanan Anda.');
          },
          onPending: function (result) {
            alert('⏳ Menunggu Pembayaran. Silakan selesaikan transaksi sesuai instruksi.');
          },
          onError: function (result) {
            alert('❌ Pembayaran Gagal/Dibatalkan.');
          },
          onClose: function () {
            alert('ℹ️ Jendela pembayaran ditutup sebelum transaksi selesai.');
          },
        });
      } else {
        alert('⚠️ Gagal memuat modul pembayaran. Silakan coba lagi.');
      }
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  return (
    <div className={inter.className} style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. STICKY NAVIGATION BAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/app-icon.png" alt="App Logo" style={{ width: '38px', height: '38px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
            <span style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
              {SITE_CONFIG.brandName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setShowOrderModal(true)} style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', backgroundColor: '#16a34a', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.2)' }}>
              🛒 Beli Akrilik
            </button>
            <button onClick={() => setShowActivateModal(true)} style={{ fontSize: '14px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer' }}>
              🚀 Aktivasi Papan
            </button>
            <button onClick={() => setSidebarOpen(true)} style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', backgroundColor: 'transparent', border: 'none', padding: '8px', cursor: 'pointer' }}>
              ☰
            </button>
          </div>
        </div>
      </nav>

      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '300px', backgroundColor: '#ffffff', height: '100%', padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Menu Navigasi</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => { setSidebarOpen(false); setShowOrderModal(true); }} style={{ textAlign: 'left', padding: '16px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                🛒 Pesan Akrilik Baru (QRIS / VA)
              </button>
              <button onClick={() => { setSidebarOpen(false); setShowActivateModal(true); }} style={{ textAlign: 'left', padding: '16px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                🚀 Aktivasi Kartu NFC
              </button>
              <Link href="/admin" onClick={() => setSidebarOpen(false)} style={{ padding: '16px', backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                🔑 Login Admin Portal
              </Link>
              <a href={waUrl} target="_blank" rel="noreferrer" style={{ padding: '16px', backgroundColor: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                💬 Chat Bantuan CS
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEMESANAN & CHECKOUT MIDTRANS */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>🛍️ Formulir Pemesanan Akrilik</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>Bayar mudah & cepat dengan QRIS atau Virtual Account.</p>

            <form onSubmit={handleProcessCheckout} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Nama Lengkap Pembeli *</label>
                <input type="text" required placeholder="Contoh: Budi Santoso" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>No. WhatsApp / Telepon *</label>
                <input type="tel" required placeholder="08xxxxxxxxxx" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Alamat Pengiriman Lengkap *</label>
                <textarea required placeholder="Jln. Ahmad Yani No. 12, Samarinda..." value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', height: '60px', fontFamily: 'inherit' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Nama Toko (Opsional)</label>
                  <input type="text" placeholder="Kopi Sedap" value={storeName} onChange={(e) => setStoreName(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Jumlah (Pcs)</label>
                  <input type="number" min="1" max="50" required value={orderQty} onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Link Google Maps / Review (Opsional)</label>
                <input type="url" placeholder="https://maps.app.goo.gl/..." value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                  <span>Harga per pcs:</span>
                  <span>Rp {PRICE_PER_ITEM.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  <span>Total Tagihan:</span>
                  <span style={{ color: '#16a34a' }}>Rp {(orderQty * PRICE_PER_ITEM).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {orderError && <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', fontWeight: '600', textAlign: 'center' }}>{orderError}</p>}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowOrderModal(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={isCheckoutLoading} style={{ flex: 2, padding: '14px', backgroundColor: isCheckoutLoading ? '#94a3b8' : '#16a34a', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: isCheckoutLoading ? 'not-allowed' : 'pointer' }}>
                  {isCheckoutLoading ? 'Memproses...' : '💳 Lanjut Pembayaran'}
                </button>
              </div>
            </form>
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
        <div style={{ display: 'inline-block', padding: '6px 16px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '13px', fontWeight: '700', borderRadius: '24px', marginBottom: '24px', border: '1px solid #bfdbfe' }}>
          ✨ Inovasi Review Google Terbaru
        </div>
        <h1 style={{ fontSize: '46px', fontWeight: '800', lineHeight: '1.15', margin: '0 0 20px 0', color: '#0f172a' }}>
          Tingkatkan Reputasi Bisnis Anda Dengan <span style={{ color: '#2563eb' }}>Sekali Sentuh</span>
        </h1>
        <p style={{ fontSize: '17px', color: '#475569', lineHeight: '1.6', margin: '0 auto 36px auto', maxWidth: '650px' }}>
          Kumpulkan ulasan Bintang 5 di Google Maps 10x lebih cepat. Pelanggan cukup tap HP ke papan pintar kami tanpa perlu mengetik nama toko Anda.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowOrderModal(true)} style={{ padding: '16px 32px', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '14px', boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.4)', cursor: 'pointer', minWidth: '200px' }}>
            🛒 Pesan via Website (QRIS/VA)
          </button>
          <a href={waUrl} target="_blank" rel="noreferrer" style={{ padding: '16px 32px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: '600', fontSize: '15px', textDecoration: 'none', borderRadius: '14px', border: '1px solid #cbd5e1', minWidth: '200px' }}>
            💬 Konsultasi WA
          </a>
        </div>
      </section>

      {/* KEUNGGULAN PRODUK */}
      <section style={{ padding: '60px 24px', maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>Desain Pintar Untuk Hasil Maksimal</h2>
        <p style={{ textAlign: 'center', fontSize: '15px', color: '#64748b', marginBottom: '48px' }}>Semua fitur yang Anda butuhkan untuk mendominasi pencarian lokal.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>⚡</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700' }}>Direct Google Review</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>Bypass pencarian manual. Pelanggan langsung dihadapkan pada form rating Bintang 5 toko Anda.</p>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#f0fdf4', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>💳</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700' }}>Pembayaran Otomatis</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>Mendukung transaksi instant QRIS (GoPay/ShopeePay/OVO) dan Virtual Account bank terkemuka.</p>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#fef2f2', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>📷</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700' }}>QR Code Ultra HD</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>Disertai QR Code resolusi tinggi dengan logo resmi Google untuk HP tanpa NFC.</p>
          </div>
        </div>
      </section>

      {/* FLOATING WHATSAPP BUTTON */}
      <a href={waUrl} target="_blank" rel="noreferrer" style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#25d366', color: '#ffffff', borderRadius: '50px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(37, 211, 102, 0.4)', textDecoration: 'none', fontWeight: '700', fontSize: '14px', zIndex: 999 }}>
        <span style={{ fontSize: '20px' }}>💬</span>
        <span>Chat CS</span>
      </a>
    </div>
  );
}
