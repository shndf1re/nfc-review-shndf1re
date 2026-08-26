'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SalesPage() {
  const [acrylicStock, setAcrylicStock] = useState(0);
  const [stockItemId, setStockItemId] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State Penjualan Baru
  const [customerName, setCustomerName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Lunas');
  const [notes, setNotes] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch Stok Papan Akrilik Only
    const { data: invData } = await supabase
      .from('inventory')
      .select('*')
      .eq('item_name', 'Papan Akrilik')
      .single();

    if (invData) {
      setAcrylicStock(invData.stock_quantity);
      setStockItemId(invData.id);
    }

    // 2. Fetch Riwayat Penjualan
    const { data: salesData } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (salesData) setSalesHistory(salesData);

    setLoading(false);
  };

  // Simpan Penjualan & Kurangi Stok Akrilik Otomatis
  const handleAddSale = async (e) => {
    e.preventDefault();
    setSubmitStatus('Menyimpan transaksi...');

    const priceNumber = parseFloat(totalPrice) || 0;
    const qtyNumber = parseInt(quantity) || 1;

    // Cek ketersediaan stok
    if (acrylicStock < qtyNumber) {
      if (!confirm(`⚠️ Stok Akrilik saat ini (${acrylicStock} pcs) kurang dari jumlah pesanan (${qtyNumber} pcs). Tetap lanjutkan?`)) {
        setSubmitStatus('');
        return;
      }
    }

    // 1. Simpan Transaksi Penjualan
    const { error: saleError } = await supabase.from('sales').insert([
      {
        customer_name: customerName,
        quantity: qtyNumber,
        total_price: priceNumber,
        device_id: deviceId || null,
        payment_status: paymentStatus,
        notes: notes || null
      }
    ]);

    if (saleError) {
      setSubmitStatus('❌ Gagal mencatat penjualan: ' + saleError.message);
      return;
    }

    // 2. Kurangi Stok Akrilik Otomatis
    if (stockItemId) {
      const newStock = Math.max(0, acrylicStock - qtyNumber);
      await supabase.from('inventory').update({ stock_quantity: newStock }).eq('id', stockItemId);
    }

    setSubmitStatus('✅ Penjualan berhasil dicatat & stok akrilik otomatis berkurang!');
    setCustomerName('');
    setQuantity(1);
    setTotalPrice('');
    setDeviceId('');
    setNotes('');
    fetchData();
  };

  // Update Stok Akrilik Manual
  const handleUpdateStock = async () => {
    const inputStock = prompt('Masukkan jumlah stok Papan Akrilik baru:', acrylicStock);
    if (inputStock === null) return;

    const newStock = parseInt(inputStock) || 0;
    if (stockItemId) {
      await supabase.from('inventory').update({ stock_quantity: newStock }).eq('id', stockItemId);
      fetchData();
    }
  };

  const totalOmzet = salesHistory.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, sans-serif' }}>
      
      {/* Header Navigasi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>💰 Pencatatan Penjualan</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Kelola Transaksi & Stok Akrilik</p>
        </div>
        <Link href="/admin" style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
          ⬅️ Dashboard Admin
        </Link>
      </div>

      {/* 1. KOTAK STOK AKRILIK UTAMA */}
      <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', display: 'block' }}>📦 Stok Papan Akrilik</span>
          <strong style={{ fontSize: '26px', color: acrylicStock <= 5 ? '#dc2626' : '#0f172a' }}>
            {acrylicStock} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>pcs</span>
          </strong>
        </div>
        <button
          onClick={handleUpdateStock}
          style={{ padding: '10px 16px', fontSize: '12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
        >
          ✏️ Update Stok Akrilik
        </button>
      </div>

      {/* 2. FORM INPUT PENJUALAN */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>➕ Input Penjualan Baru</h3>
        
        <form onSubmit={handleAddSale} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>Nama Pembeli / Toko</label>
            <input type="text" required placeholder="Contoh: Kedai Kopi Samarinda" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>Jumlah (Pcs)</label>
              <input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>

            <div style={{ flex: 2 }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>Total Harga Jual (Rp)</label>
              <input type="number" required placeholder="Contoh: 150000" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>ID Kartu NFC (Opsional)</label>
              <input type="text" placeholder="NFC-xxxxx" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>Status Bayar</label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                <option value="Lunas">✅ Lunas</option>
                <option value="DP 50%">⏳ DP 50%</option>
                <option value="Belum Bayar">❌ Belum Bayar</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>Catatan Transaksi</label>
            <input type="text" placeholder="Contoh: Termasuk dudukan kayu / Ongkir COD" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" style={{ padding: '12px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginTop: '6px' }}>
            💾 Simpan Penjualan
          </button>
        </form>

        {submitStatus && <p style={{ marginTop: '12px', fontSize: '12px', color: '#2563eb', textAlign: 'center', fontWeight: '600' }}>{submitStatus}</p>}
      </div>

      {/* 3. LAPORAN & RIWAYAT PENJUALAN */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Riwayat Transaksi ({salesHistory.length})</h3>
            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>
              Total Omzet: Rp {totalOmzet.toLocaleString('id-ID')}
            </span>
          </div>
          <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>🔄 Refresh</button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat riwayat transaksi...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {salesHistory.map((sale) => (
              <div key={sale.id} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px' }}>{sale.customer_name}</strong>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>
                    Rp {parseFloat(sale.total_price).toLocaleString('id-ID')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>Qty: <strong>{sale.quantity} Pcs Akrilik</strong> {sale.device_id && `(${sale.device_id})`}</span>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: sale.payment_status === 'Lunas' ? '#dcfce7' : '#fef3c7', color: sale.payment_status === 'Lunas' ? '#15803d' : '#b45309', fontWeight: '700' }}>
                    {sale.payment_status}
                  </span>
                </div>

                {sale.notes && <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>📝 {sale.notes}</p>}
              </div>
            ))}

            {salesHistory.length === 0 && <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>Belum ada penjualan dicatat.</p>}
          </div>
        )}
      </div>

    </div>
  );
}
