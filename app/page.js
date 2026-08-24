'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    // Cek jika admin sudah login sebelumnya di HP ini
    const savedSession = localStorage.getItem('nfc_admin_session');
    if (savedSession === 'true') {
      setIsAdminLoggedIn(true);
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Navigation Header */}
      <nav style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justify.content: 'center',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>⚡</div>
          <span style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a' }}>TapReview</span>
        </div>

        {/* Akses Cepat Admin */}
        <Link
          href="/admin"
          style={{
            padding: '8px 16px',
            backgroundColor: isAdminLoggedIn ? '#16a34a' : '#2563eb',
            color: '#ffffff',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
          }}
        >
          {isAdminLoggedIn ? '🔑 Ke Dashboard Admin' : '🔒 Login Admin'}
        </Link>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: '48px 24px 32px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <span style={{
          display: 'inline-block',
          padding: '6px 14px',
          backgroundColor: '#eff6ff',
          color: '#2563eb',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          marginBottom: '16px'
        }}>
          NFC & QR Google Review System
        </span>
        <h1 style={{ fontSize: '28px', fontWeight: '800', lineHeight: '1.3', margin: '0 0 16px 0', color: '#0f172a' }}>
          Tingkatkan Review Google Maps Toko Anda dengan Sekali Tap
        </h1>
        <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px 0' }}>
          Solusi papan akrilik pintar berbasis NFC dan QR Code interaktif untuk mempermudah pelanggan memberikan rating bintang 5 di Google Review.
        </p>

        {/* Quick Shortcut Box untuk Pemilik */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          textAlign: 'left',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Pintasan Admin</span>
            <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>Khusus Pemilik</span>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
            Kelola chip NFC, generate PIN aktivasi baru, dan unduh cetakan QR Code.
          </p>
          <Link
            href="/admin"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '12px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Masuk Portal Dashboard →
          </Link>
        </div>
      </section>

      {/* Features & Menu Showcase Section */}
      <section style={{ padding: '0 24px 48px 24px', maxWidth: '600px', margin: '0 auto' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', textAlign: 'center' }}>
          Layanan & Fitur Utama
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Menu 1 */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ fontSize: '24px', backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '12px' }}>📲</div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600' }}>Instant Auto-Redirect</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Sistem pengalihan otomatis 1-tap menuju link Google Review tanpa aplikasi tambahan.</p>
            </div>
          </div>

          {/* Menu 2 */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ fontSize: '24px', backgroundColor: '#eff6ff', padding: '10px', borderRadius: '12px' }}>🔐</div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600' }}>Aktivasi Mandiri via PIN</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Pembeli dapat dengan mudah menautkan Google Maps toko mereka secara mandiri.</p>
            </div>
          </div>

          {/* Menu 3 */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ fontSize: '24px', backgroundColor: '#fef3c7', padding: '10px', borderRadius: '12px' }}>🖨️</div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600' }}>QR Code Generator</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Otomatis memproduksi QR Code siap cetak untuk dipasang di papan akrilik.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / About Us */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '24px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#94a3b8'
      }}>
        <p style={{ margin: '0 0 6px 0', fontWeight: '600', color: '#475569' }}>About Us - TapReview System</p>
        <p style={{ margin: 0 }}>Platform Manajemen NFC & QR Code pintar untuk toko & UMKM.</p>
      </footer>

    </div>
  );
}
