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

  // State Edit Status Transaksi yang Sedang Dipilih
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState('');

  // State Modal Pop-Up PIN & Input Kustom
  const [modalState, setModalState] = useState({
    isOpen: false,
    actionType: null, // 'delete', 'updateStock', atau 'updateStatus'
    targetData: null,
    stockInput: '',
    pinInput: '',
    errorMsg: '',
    isVerifying: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch Stok Papan Akrilik
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

  // Simpan Penjualan Baru
  const handleAddSale = async (e) => {
    e.preventDefault();
    setSubmitStatus('');

    const priceNumber = parseFloat(totalPrice) || 0;
    const qtyNumber = parseInt(quantity) || 1;

    if (acrylicStock <= 0) {
      setSubmitStatus('❌ Transaksi gagal! Stok Papan Akrilik sudah HABIS (0 pcs). Silakan update stok terlebih dahulu.');
      return;
    }

    if (qtyNumber > acrylicStock) {
      setSubmitStatus(`❌ Transaksi dibatalkan! Jumlah pesanan (${qtyNumber} pcs) melebihi sisa stok (${acrylicStock} pcs).`);
      return;
    }

    setSubmitStatus('Menyimpan transaksi...');

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

    if (stockItemId) {
      const newStock = acrylicStock - qtyNumber;
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

  // Buka Modal Update Stok
  const openUpdateStockModal = () => {
    setModalState({
      isOpen: true,
      actionType: 'updateStock',
      targetData: null,
      stockInput: acrylicStock.toString(),
      pinInput: '',
      errorMsg: '',
      isVerifying: false
    });
  };

  // Buka Modal Hapus Penjualan
  const openDeleteSaleModal = (sale) => {
    setModalState({
      isOpen: true,
      actionType: 'delete',
      targetData: sale,
      stockInput: '',
      pinInput: '',
      errorMsg: '',
      isVerifying: false
    });
  };

  // Buka Modal Konfirmasi PIN Perubahan Status Bayar
  const openUpdateStatusModal = (sale) => {
    setModalState({
      isOpen: true,
      actionType: 'updateStatus',
      targetData: sale,
      stockInput: '',
      pinInput: '',
      errorMsg: '',
      isVerifying: false
    });
  };

  // Eksekusi Konfirmasi Modal via RPC Supabase
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalState(prev => ({ ...prev, isVerifying: true, errorMsg: '' }));

    let newStockVal = 0;
    if (modalState.actionType === 'updateStock') {
      newStockVal = parseInt(modalState.stockInput);
      if (isNaN(newStockVal) || newStockVal < 0) {
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ Jumlah stok tidak valid!' }));
        return;
      }
    }

    // Verifikasi PIN via RPC Supabase
    const { data: isValidPin, error: pinError } = await supabase.rpc('verify_sales_pin', {
      input_pin: modalState.pinInput.trim()
    });

    if (pinError || !isValidPin) {
      setModalState(prev => ({
        ...prev,
        isVerifying: false,
        errorMsg: '❌ PIN Admin Salah! Transaksi dibatalkan.'
      }));
      return;
    }

    // Eksekusi Berdasarkan Jenis Aksi
    if (modalState.actionType === 'updateStock') {
      if (stockItemId) {
        await supabase.from('inventory').update({ stock_quantity: newStockVal }).eq('id', stockItemId);
      }
    } else if (modalState.actionType === 'delete') {
      const sale = modalState.targetData;
      await supabase.from('sales').delete().eq('id', sale.id);

      if (stockItemId) {
        const restoredStock = acrylicStock + (parseInt(sale.quantity) || 1);
        await supabase.from('inventory').update({ stock_quantity: restoredStock }).eq('id', stockItemId);
      }
    } else if (modalState.actionType === 'updateStatus') {
      const sale = modalState.targetData;
      await supabase
        .from('sales')
        .update({ payment_status: selectedNewStatus })
        .eq('id', sale.id);
      
      setEditingSaleId(null);
    }

    setModalState({ isOpen: false, actionType: null, targetData: null, stockInput: '', pinInput: '', errorMsg: '', isVerifying: false });
    fetchData();
  };

  const totalOmzet = salesHistory.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, sans-serif' }}>
      
      {/* Header Navigasi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>💰 Kelola Hasil Penjualan</h2>
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
          onClick={openUpdateStockModal}
          style={{ padding: '10px 16px', fontSize: '12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
        >
          🔒 Update Stok Akrilik
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
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>
                Jumlah (Pcs) <span style={{ color: '#dc2626' }}>(Maks: {acrylicStock})</span>
              </label>
              <input type="number" min="1" max={acrylicStock} required value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
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

          <button
            type="submit"
            disabled={acrylicStock <= 0}
            style={{
              padding: '12px',
              backgroundColor: acrylicStock <= 0 ? '#94a3b8' : '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: acrylicStock <= 0 ? 'not-allowed' : 'pointer',
              marginTop: '6px'
            }}
          >
            {acrylicStock <= 0 ? '❌ Stok Akrilik Habis' : '💾 Simpan Penjualan'}
          </button>
        </form>

        {submitStatus && <p style={{ marginTop: '12px', fontSize: '12px', color: submitStatus.startsWith('❌') ? '#dc2626' : '#2563eb', textAlign: 'center', fontWeight: '600' }}>{submitStatus}</p>}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px' }}>{sale.customer_name}</strong>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>
                    Rp {parseFloat(sale.total_price).toLocaleString('id-ID')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                  <span>Qty: <strong>{sale.quantity} Pcs Akrilik</strong> {sale.device_id && `(${sale.device_id})`}</span>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    
                    {/* EDIT STATUS SECTION */}
                    {editingSaleId === sale.id ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <select
                          value={selectedNewStatus}
                          onChange={(e) => setSelectedNewStatus(e.target.value)}
                          style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="Lunas">✅ Lunas</option>
                          <option value="DP 50%">⏳ DP 50%</option>
                          <option value="Belum Bayar">❌ Belum Bayar</option>
                        </select>
                        <button
                          onClick={() => openUpdateStatusModal(sale)}
                          style={{ padding: '2px 6px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Simpan (PIN)
                        </button>
                        <button
                          onClick={() => setEditingSaleId(null)}
                          style={{ padding: '2px 6px', backgroundColor: '#cbd5e1', color: '#334155', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: sale.payment_status === 'Lunas' ? '#dcfce7' : sale.payment_status === 'DP 50%' ? '#fef3c7' : '#fee2e2',
                          color: sale.payment_status === 'Lunas' ? '#15803d' : sale.payment_status === 'DP 50%' ? '#b45309' : '#dc2626',
                          fontWeight: '700'
                        }}>
                          {sale.payment_status}
                        </span>
                        
                        <button
                          onClick={() => { setEditingSaleId(sale.id); setSelectedNewStatus(sale.payment_status); }}
                          style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                        >
                          ✏️ Edit Status
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => openDeleteSaleModal(sale)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                    >
                      🗑️ Hapus
                    </button>

                  </div>
                </div>

                {sale.notes && <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>📝 {sale.notes}</p>}
              </div>
            ))}

            {salesHistory.length === 0 && <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>Belum ada penjualan dicatat.</p>}
          </div>
        )}
      </div>

      {/* 4. MODAL POP-UP KUSTOM */}
      {modalState.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px'
        }}>
          <div style={{
            width: '100%', maxWidth: '360px',
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', textAlign: 'center'
          }}>
            <div style={{
              width: '44px', height: '44px',
              backgroundColor: modalState.actionType === 'delete' ? '#fef2f2' : '#eff6ff',
              color: modalState.actionType === 'delete' ? '#ef4444' : '#2563eb',
              borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', marginBottom: '12px'
            }}>
              {modalState.actionType === 'delete' ? '🗑️' : modalState.actionType === 'updateStatus' ? '📝' : '📦'}
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
              {modalState.actionType === 'delete' ? 'Hapus Penjualan' : modalState.actionType === 'updateStatus' ? 'Ubah Status Bayar' : 'Update Stok Akrilik'}
            </h3>

            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              {modalState.actionType === 'delete'
                ? `Menghapus catatan penjualan "${modalState.targetData?.customer_name}".`
                : modalState.actionType === 'updateStatus'
                ? `Mengubah status bayar "${modalState.targetData?.customer_name}" menjadi "${selectedNewStatus}".`
                : 'Ubah jumlah total stok Papan Akrilik yang tersedia saat ini.'}
            </p>

            <form onSubmit={handleModalSubmit}>
              {modalState.actionType === 'updateStock' && (
                <div style={{ marginBottom: '12px', textAlign: 'left' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Stok Akrilik Baru (Pcs)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Jumlah stok"
                    value={modalState.stockInput}
                    onChange={(e) => setModalState(prev => ({ ...prev, stockInput: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none'
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>PIN Admin Konfirmasi</label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan PIN 6-digit"
                  value={modalState.pinInput}
                  onChange={(e) => setModalState(prev => ({ ...prev, pinInput: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px', fontSize: '15px', textAlign: 'center',
                    letterSpacing: '3px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    boxSizing: 'border-box', outline: 'none', backgroundColor: '#f8fafc'
                  }}
                />
              </div>

              {modalState.errorMsg && (
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                  {modalState.errorMsg}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalState({ isOpen: false, actionType: null, targetData: null, stockInput: '', pinInput: '', errorMsg: '', isVerifying: false })}
                  style={{
                    flex: 1, padding: '10px', backgroundColor: '#f1f5f9', color: '#475569',
                    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                
                <button
                  type="submit"
                  disabled={modalState.isVerifying}
                  style={{
                    flex: 1, padding: '10px',
                    backgroundColor: modalState.actionType === 'delete' ? '#ef4444' : '#2563eb',
                    color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px',
                    fontWeight: '600', cursor: modalState.isVerifying ? 'not-allowed' : 'pointer'
                  }}
                >
                  {modalState.isVerifying ? 'Memeriksa...' : 'Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
