'use client';

import { useState, useEffect } from 'react';

export default function TrackOrderPage() {
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Otomatis terisi nomor HP & Order ID dari sesi terakhir jika ada
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPhone = localStorage.getItem('last_customer_phone') || '';
      const savedOrder = localStorage.getItem('last_order_id') || '';
      if (savedPhone) setPhone(savedPhone);
      if (savedOrder) setOrderId(savedOrder);
      
      if (savedPhone || savedOrder) {
        fetchOrders(savedPhone, savedOrder);
      }
    }
  }, []);

  const fetchOrders = async (searchPhone, searchOrder) => {
    setLoading(true);
    setErrorMsg('');
    setOrders([]);

    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: searchPhone || phone,
          orderId: searchOrder || orderId
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Pesanan tidak ditemukan.');
      } else {
        setOrders(data.orders || []);
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!phone && !orderId) {
      alert('Masukkan Nomor WA atau Order ID terlebih dahulu.');
      return;
    }
    fetchOrders(phone, orderId);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px 14px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      boxSizing: 'border-box',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <a href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>← Ke Beranda</a>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '20px' }}>📦 Lacak Pesanan</span>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Cek Status Pesanan</h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.4' }}>
          Masukkan Nomor WhatsApp atau ID Pesanan Anda untuk melihat status pembayaran dan pengiriman.
        </p>

        <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Nomor WhatsApp</label>
          <input
            type="tel"
            placeholder="Contoh: 08123456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1',
              fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box', outline: 'none'
            }}
          />

          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Order ID (Opsional)</label>
          <input
            type="text"
            placeholder="Contoh: NFC-1718000000-123"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1',
              fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', backgroundColor: '#2563eb', color: '#ffffff', padding: '14px',
              borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
            }}
          >
            {loading ? 'Mencari Data...' : '🔍 Cari Pesanan'}
          </button>
        </form>

        {errorMsg && (
          <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '12px', fontSize: '13px', border: '1px solid #fee2e2', marginBottom: '16px' }}>
            ❌ {errorMsg}
          </div>
        )}

        {/* DAFTAR PESANAN YANG DITEMUKAN */}
        {orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Hasil Pencarian ({orders.length})</h2>

            {orders.map((item) => {
              const isPaid = item.payment_status === 'paid' || item.payment_status === 'PAID' || item.payment_status === 'Lunas';
              const isPending = item.payment_status === 'pending' || item.payment_status === 'UNPAID';

              return (
                <div key={item.order_id} style={{
                  backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>{item.order_id}</span>
                    <span style={{
                      fontSize: '11px', fontWeight: '800', padding: '4px 8px', borderRadius: '8px',
                      backgroundColor: isPaid ? '#dcfce7' : (isPending ? '#fef3c7' : '#f1f5f9'),
                      color: isPaid ? '#15803d' : (isPending ? '#b45309' : '#64748b')
                    }}>
                      {isPaid ? 'LUNAS / ON PROGRESS' : (isPending ? 'BELUM DIBAYAR' : item.payment_status.toUpperCase())}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                    <strong>Pemesan:</strong> {item.customer_name} ({item.quantity} Pcs)
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                    <strong>Kurir:</strong> {item.courier || 'Reguler'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a', marginBottom: '12px' }}>
                    Total Tagihan: Rp {Number(item.total_price || 0).toLocaleString('id-ID')}
                  </div>

                  {/* TOMBOL BAYAR SEKARANG JIKA MASIH PENDING */}
                  {isPending && item.checkout_url && (
                    <button
                      onClick={() => window.location.href = item.checkout_url}
                      style={{
                        width: '100%', backgroundColor: '#16a34a', color: '#ffffff', padding: '10px',
                        borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'
                      }}
                    >
                      💳 Lanjutkan Pembayaran (Tripay)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
