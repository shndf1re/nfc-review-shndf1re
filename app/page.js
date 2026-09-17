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

  // State Navigasi & Modal Aktivasi
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [cardIdInput, setCardIdInput] = useState('');
  const [cardPinInput, setCardPinInput] = useState('');
  const [activateError, setActivateError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Harga Terbaru
  const ORIGINAL_PRICE = SITE_CONFIG.pricing?.originalPrice || 100000;
  const DISCOUNT_PRICE = SITE_CONFIG.pricing?.discountPrice || 65000;
  const PROMO_TAG = SITE_CONFIG.pricing?.promoTag || '🔥 PROMO SPESIAL 35% OFF';

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
            <Link href="/beli" style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', backgroundColor: '#16a34a', padding: '10px 18px', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.2)' }}>
              🛒 Beli Akrilik
            </Link>
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
              <Link href="/beli" onClick={() => setSidebarOpen(false)} style={{ padding: '16px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '12px', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
                🛒 Pesan Akrilik Baru (QRIS / VA)
              </Link>
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

      {/* 2. HERO SECTION */}
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
          <span style={{ fontSize: '11px', color: '#dc2626', backgroundColor: '#fee2e2', fontWeight: '700', padding: '2px 8px', borderRadius: '6px' }}>HEMAT 35%</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/beli" style={{ padding: '16px 32px', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: '700', fontSize: '15px', borderRadius: '14px', textDecoration: 'none', boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.4)', minWidth: '200px', display: 'inline-block' }}>
            🛒 Pesan Papan Akrilik
          </Link>
          <a href={waUrl} target="_blank" rel="noreferrer" style={{ padding: '16px 32px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: '600', fontSize: '15px', textDecoration: 'none', borderRadius: '14px', border: '1px solid #cbd5e1', minWidth: '200px', display: 'inline-block' }}>
            💬 Konsultasi WA
          </a>
        </div>
      </section>

      {/* 3. GALERI PRODUK (BARU DITAMBAHKAN) */}
      <section style={{ padding: '40px 24px 60px 24px', maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>Lihat Produk Kami</h2>
        <p style={{ textAlign: 'center', fontSize: '15px', color: '#64748b', marginBottom: '32px' }}>Papan Akrilik tebal dicetak dengan tinta Print UV tahan air dan anti luntur.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Pastikan foto galeri-1.jpg dst sudah ada di folder public */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <img src="/galeri-1.jpg" alt="Papan NFC 1" style={{ width: '100%', height: '220px', objectFit: 'cover' }} onError={(e) => { e.target.src = '/app-icon.png'; e.target.style.objectFit = 'contain'; e.target.style.padding = '20px'; e.target.style.backgroundColor = '#f8fafc'; }} />
          </div>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <img src="/galeri-2.jpg" alt="Papan NFC 2" style={{ width: '100%', height: '220px', objectFit: 'cover' }} onError={(e) => { e.target.src = '/app-icon.png'; e.target.style.objectFit = 'contain'; e.target.style.padding = '20px'; e.target.style.backgroundColor = '#f8fafc'; }} />
          </div>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <img src="/galeri-3.jpg" alt="Papan NFC 3" style={{ width: '100%', height: '220px', objectFit: 'cover' }} onError={(e) => { e.target.src = '/app-icon.png'; e.target.style.objectFit = 'contain'; e.target.style.padding = '20px'; e.target.style.backgroundColor = '#f8fafc'; }} />
          </div>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <img src="/galeri-4.jpg" alt="Papan NFC 4" style={{ width: '100%', height: '220px', objectFit: 'cover' }} onError={(e) => { e.target.src = '/app-icon.png'; e.target.style.objectFit = 'contain'; e.target.style.padding = '20px'; e.target.style.backgroundColor = '#f8fafc'; }} />
          </div>
        </div>
      </section>

      {/* 4. FEATURE & FITUR UNGULAN */}
      <section style={{ padding: '20px 24px 60px 24px', maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
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
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>Disertai QR Code resolusi tinggi dengan logo resmi Google untuk HP tanpa fitur NFC.</p>
          </div>
        </div>
      </section>

      {/* 5. CARA KERJA / EASY STEPS */}
      <section style={{ backgroundColor: '#ffffff', padding: '60px 24px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>3 Langkah Mudah Penggunaan</h2>
          <p style={{ textAlign: 'center', fontSize: '15px', color: '#64748b', marginBottom: '48px' }}>Siap digunakan hanya dalam hitungan menit.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>1</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>Pesan Papan NFC</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>Beli papan akrilik berkualitas tinggi melalui pembayaran otomatis QRIS/VA.</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>2</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>Aktivasi 1 Menit</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>Masukkan ID & PIN paket, lalu tempelkan link ulasan Google Maps toko Anda.</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>3</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>Pajang & Kumpulkan Review</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>Pajang di kasir/meja, minta pelanggan tap HP mereka, dan ulasan bintang 5 pun melimpah!</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER DENGAN LINK LEGAL TRIPAY */}
      <footer style={{ marginTop: 'auto', padding: '40px 24px', backgroundColor: '#0f172a', color: '#94a3b8', fontSize: '13px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '24px' }}>
          
          <div style={{ flex: '1 1 250px' }}>
            <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>{SITE_CONFIG.brandName}</h3>
            <p style={{ margin: '0 0 8px 0', lineHeight: '1.5' }}>Solusi cerdas kumpulkan ulasan Google Maps Bintang 5 lebih cepat dengan teknologi NFC & QR Code.</p>
            <p style={{ margin: 0 }}>📍 Samarinda, Kalimantan Timur, Indonesia</p>
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Informasi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/about" style={{ color: '#94a3b8', textDecoration: 'none' }}>Tentang Kami</Link>
              <Link href="/privacy-policy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Kebijakan Privasi</Link>
              <Link href="/tos" style={{ color: '#94a3b8', textDecoration: 'none' }}>Syarat & Ketentuan</Link>
              <Link href="/refund-policy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Kebijakan Pengembalian</Link>
            </div>
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Hubungi Kami</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href={waUrl} target="_blank" rel="noreferrer" style={{ color: '#94a3b8', textDecoration: 'none' }}>📞 WhatsApp Admin</a>
              <Link href="/admin" style={{ color: '#94a3b8', textDecoration: 'none' }}>🔑 Admin Login</Link>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #334155', marginTop: '32px', paddingTop: '20px', textAlign: 'center' }}>
          <p style={{ margin: 0 }}>© {new Date().getFullYear()} {SITE_CONFIG.brandName}. All rights reserved.</p>
        </div>
      </footer>

      {/* FLOATING WHATSAPP BUTTON */}
      <a href={waUrl} target="_blank" rel="noreferrer" style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#25d366', color: '#ffffff', borderRadius: '50px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(37, 211, 102, 0.4)', textDecoration: 'none', fontWeight: '700', fontSize: '14px', zIndex: 999 }}>
        <span style={{ fontSize: '20px' }}>💬</span>
        <span>Chat CS</span>
      </a>

    </div>
  );
}
