'use client';

import Link from 'next/link';
import { SITE_CONFIG } from '../lib/config';

export default function LandingPage() {
  const waUrl = `https://wa.me/${SITE_CONFIG.supportWhatsapp}?text=${encodeURIComponent(SITE_CONFIG.waPromoText)}`;

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh', paddingBottom: '80px' }}>
      
      {/* 1. STICKY NAVIGATION BAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2e8f0', padding: '14px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Logo & Brand Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>
              N
            </div>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
              {SITE_CONFIG.brandName}
            </span>
          </div>

          {/* Menu Navigasi Desktop & Mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/admin" style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textDecoration: 'none', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              🔑 Admin Login
            </Link>
            
            <a href={waUrl} target="_blank" rel="noreferrer" style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', backgroundColor: '#16a34a', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)' }}>
              💬 Pesan via WA
            </a>
          </div>

        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section style={{ padding: '60px 20px 40px 20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <span style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '12px', fontWeight: '700', borderRadius: '20px', marginBottom: '16px', border: '1px solid #bfdbfe' }}>
          🚀 Solusi Tambah Ulasan Google Review 10x Lebih Cepat
        </span>
        
        <h1 style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.25', margin: '0 0 16px 0', color: '#0f172a' }}>
          Tingkatkan Bintang & Trust Toko Anda Hanya Dengan <span style={{ color: '#2563eb' }}>1-Tap NFC Akrilik</span>
        </h1>
        
        <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 28px 0' }}>
          Memudahkan pelanggan memberikan ulasan Bintang 5 di Google Maps tanpa ribet ketik nama toko. Cukup tempelkan HP ke papan akrilik atau scan QR Code!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
          <a href={waUrl} target="_blank" rel="noreferrer" style={{ padding: '14px 24px', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '15px', textDecoration: 'none', borderRadius: '12px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)', textAlign: 'center' }}>
            🛒 Pesan Papan NFC Sekarang
          </a>
          <a href="#fitur" style={{ padding: '12px 24px', backgroundColor: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '14px', textDecoration: 'none', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
            Pelajari Fitur & Cara Kerja ↓
          </a>
        </div>
      </section>

      {/* 3. KEUNGGULAN PRODUK (FEATURE CARDS) */}
      <section id="fitur" style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '22px', fontWeight: '700', marginBottom: '28px' }}>
          Mengapa Bisnis Anda Wajib Punya Papan Ini?
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>⚡</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>Direct Google Review</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Pelanggan langsung diarahkan ke form Bintang 5 Google Review tanpa perlu mencari atau mengetik nama toko Anda.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔒</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>Sistem Chip Terkunci</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Chip NFC terproteksi aman dan terhubung dengan database cloud. Lokasi toko dapat diperbarui kapan saja jika pindah alamat.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>📷</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>QR Code Ultra HD Backup</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Dilengkapi QR Code beresolusi tinggi dengan logo Google resmi di tengah untuk HP yang belum mendukung fitur NFC.
            </p>
          </div>

        </div>
      </section>

      {/* 4. CARA KERJA (HOW IT WORKS) */}
      <section style={{ backgroundColor: '#ffffff', padding: '40px 20px', margin: '20px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px' }}>3 Langkah Sederhana</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '800', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>1</div>
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>Tap / Scan</strong>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Pelanggan menempelkan HP ke akrilik / scan QR</span>
            </div>

            <div>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '800', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>2</div>
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>Otomatis Terbuka</strong>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Halaman ulasan toko Anda otomatis terbuka</span>
            </div>

            <div>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '800', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>3</div>
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>Bintang 5 Terkirim</strong>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Ulasan positif bertambah di Google Maps</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION & FOOTER */}
      <section style={{ textAlign: 'center', padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>Tertarik Memesan Papan Review Toko Anda?</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          Konsultasikan kebutuhan desain dan akrilik toko Anda secara gratis via WhatsApp.
        </p>
        <a href={waUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '14px 28px', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: '700', fontSize: '15px', textDecoration: 'none', borderRadius: '12px', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}>
          💬 Chat Pemesanan via WhatsApp
        </a>
      </section>

      {/* 6. FLOATING WHATSAPP BUTTON (MELAYANG DI POJOK KANAN BAWAH HP) */}
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#25d366',
          color: '#ffffff',
          borderRadius: '50px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          textDecoration: 'none',
          fontWeight: '700',
          fontSize: '13px',
          zIndex: 999
        }}
      >
        <span style={{ fontSize: '18px' }}>💬</span>
        <span>Hubungi Kami</span>
      </a>

    </div>
  );
}
