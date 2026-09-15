'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function TrackOrderPage() {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [copyStatus, setCopyStatus] = useState('Salin');

  useEffect(() => {
    setIsMounted(true);

    // Auto-detect dari LocalStorage jika pernah order dari HP/Browser ini
    const savedOrderId = localStorage.getItem('last_order_id');
    const savedPhone = localStorage.getItem('last_customer_phone');

    if (savedOrderId) {
      setSearchInput(savedOrderId);
      fetchOrder(savedOrderId);
    } else if (savedPhone) {
      setSearchInput(savedPhone);
      fetchOrder(savedPhone);
    }
  }, []);

  const fetchOrder = async (queryTerm) => {
    const term = (queryTerm || searchInput).trim();
    if (!term) {
      setErrorMessage('Masukkan Nomor WA atau Order ID Anda.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setOrderData(null);

    try {
      // Cari berdasarkan order_id ATAU customer_phone
      let { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`order_id.eq.${term},customer_phone.eq.${term}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setErrorMessage('Gagal mengambil data: ' + error.message);
      } else if (!data) {
        setErrorMessage('Pesanan tidak ditemukan. Pastikan Nomor WA atau ID Order sudah benar.');
      } else {
        setOrderData(data);
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrder();
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (['shipped', 'dikirim', 'sedang dikirim'].includes(s)) {
      return { label: '🚚 SEDANG DIKIRIM', bg: '#e0f2fe', color: '#0284c7' };
    }
    if (['settlement', 'paid', 'success', 'lunas'].includes(s)) {
      return { label: '✅ LUNAS / DIPROSES', bg: '#dcfce7', color: '#15803d' };
    }
    if (['pending', 'belum bayar'].includes(s)) {
      return { label: '⏳ MENUNGGU PEMBAYARAN', bg: '#fef3c7', color: '#b45309' };
    }
    return { label: '❌ BATAL / EXPIRED', bg: '#fee2e2', color: '#dc2626' };
  };

  const handleCopyResi = (resiText) => {
    navigator.clipboard.writeText(resiText);
    setCopyStatus('Tersalin! ✔️');
    setTimeout(() => setCopyStatus('Salin'), 2000);
  };

  if (!isMounted) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '24px 16px', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>📦 Lacak Pesanan</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Cek status pengiriman & cetak akrilik</p>
          </div>
          <Link href="/" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>
            ← Utama
          </Link>
        </div>

        {/* FORM PENCARIAN */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          <form onSubmit={handleSearchSubmit}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
              Nomor WhatsApp / Order ID *
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                required
                placeholder="Contoh: 08123456789 atau NFC-..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '0 16px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                {loading ? '...' : '🔍 Lacak'}
              </button>
            </div>
          </form>

          {errorMessage && (
            <p style={{ marginTop: '12px', fontSize: '12px', color: '#dc2626', fontWeight: '600', marginBottom: 0 }}>
              {errorMessage}
            </p>
          )}
        </div>

        {/* DETAIL PESANAN */}
        {orderData && (
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            
            {/* STATUS BADGE */}
            <div style={{ textAlign: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px dashed #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Status Pesanan:</span>
              <span style={{ 
                padding: '6px 14px', 
                borderRadius: '20px', 
                backgroundColor: getStatusBadge(orderData.payment_status).bg, 
                color: getStatusBadge(orderData.payment_status).color,
                fontWeight: '800',
                fontSize: '12px',
                letterSpacing: '0.5px'
              }}>
                {getStatusBadge(orderData.payment_status).label}
              </span>
            </div>

            {/* KOTAK NOMOR RESI (JIKA SUDAH DIINPUT ADMIN) */}
            {orderData.resi_number && (
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8', display: 'block', marginBottom: '4px' }}>
                  🚚 NOMOR RESI PENGIRIMAN:
                </span>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '16px', color: '#1e40af', fontFamily: 'monospace', letterSpacing: '1px' }}>
                    {orderData.resi_number}
                  </strong>
                  <button
                    onClick={() => handleCopyResi(orderData.resi_number)}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    📋 {copyStatus}
                  </button>
                </div>
                <span style={{ fontSize: '10px', color: '#60a5fa', display: 'block', marginTop: '4px' }}>
                  Salin nomor resi untuk cek posisi paket di aplikasi kurir.
                </span>
              </div>
            )}

            {/* INFORMASI UTAMA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Order ID:</span>
                <strong style={{ color: '#0f172a' }}>{orderData.order_id || orderData.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Nama Pemesan:</span>
                <strong style={{ color: '#0f172a' }}>{orderData.customer_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Jumlah Pesanan:</span>
                <strong style={{ color: '#0f172a' }}>{orderData.quantity || 1} Pcs (Papan Akrilik NFC)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Ekspedisi / Kurir:</span>
                <strong style={{ color: '#2563eb' }}>{orderData.courier || 'Ekspedisi Reguler'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ color: '#64748b' }}>Total Pembayaran:</span>
                <strong style={{ color: '#16a34a', fontSize: '15px' }}>
                  Rp {(parseFloat(orderData.total_price) || 0).toLocaleString('id-ID')}
                </strong>
              </div>
            </div>

            {/* ALAMAT PENGIRIMAN */}
            <div style={{ marginTop: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>📍 Alamat Tujuan:</span>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                {orderData.shipping_address || 'Alamat tidak dicantumkan'}
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
