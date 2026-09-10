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
  const [stockItemRecord, setStockItemRecord] = useState(null);
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

  // State Edit Status Transaksi
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState('');

  // State Filter Tanggal & Bulan
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State Modal Warning Stok WA
  const [waAlertModal, setWaAlertModal] = useState({
    isOpen: false,
    stockLeft: 0,
    waUrl: ''
  });

  // State Modal PIN Kustom
  const [modalState, setModalState] = useState({
    isOpen: false,
    actionType: null,
    targetData: null,
    stockInput: '',
    pinInput: '',
    errorMsg: '',
    isVerifying: false
  });

  // REALTIME LISTENER SUPABASE
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('sales-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: invData, error: invError } = await supabase
      .from('inventory')
      .select('*')
      .ilike('item_name', '%Papan Akrilik%')
      .limit(1)
      .maybeSingle();

    if (invError) {
      console.error('Error fetching inventory:', invError);
    } else if (invData) {
      setAcrylicStock(Number(invData.stock_quantity) || 0);
      setStockItemRecord(invData);
    }

    let query = supabase.from('sales').select('*').order('created_at', { ascending: false });

    if (startDate && endDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`);
    } else if (selectedMonth) {
      const year = selectedMonth.split('-')[0];
      const month = selectedMonth.split('-')[1];
      const startOfMonth = `${year}-${month}-01T00:00:00`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${month}-${lastDay}T23:59:59`;

      query = query.gte('created_at', startOfMonth).lte('created_at', endOfMonth);
    }

    const { data: salesData } = await query;
    if (salesData) setSalesHistory(salesData);

    setLoading(false);
  };

  const handleFilterCustomDate = (e) => {
    e.preventDefault();
    fetchData();
  };

  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
    setSelectedMonth(new Date().toISOString().substring(0, 7));
  };

  // FUNGSI NOTIFIKASI STOK WA (DENGAN MODAL DIALOG)
  const checkAndTriggerLowStockModal = (currentStock) => {
    const LOW_STOCK_LIMIT = 5;
    const ADMIN_PHONE = '6285156534909';

    if (currentStock <= LOW_STOCK_LIMIT) {
      const message = `⚠️ *PERINGATAN STOK TIPIS!*\n\nStok item *Papan Akrilik* saat ini tersisa *${currentStock} pcs* (Batas Minimum: ${LOW_STOCK_LIMIT} pcs).\n\nMohon segera lakukan *restock* atau pemesanan ulang ke supplier.`;
      const waUrl = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(message)}`;

      setWaAlertModal({
        isOpen: true,
        stockLeft: currentStock,
        waUrl
      });
    }
  };

  const handleAddSale = async (e) => {
    e.preventDefault();
    setSubmitStatus('');

    const priceNumber = parseFloat(totalPrice) || 0;
    const qtyNumber = parseInt(quantity, 10) || 1;

    if (acrylicStock <= 0 || qtyNumber > acrylicStock) {
      setSubmitStatus('❌ Stok Akrilik tidak mencukupi!');
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
      setSubmitStatus('❌ Gagal mencatat: ' + saleError.message);
      return;
    }

    const newStock = Math.max(0, acrylicStock - qtyNumber);
    const targetId = stockItemRecord?.id || 1;

    const { error: stockUpdateErr } = await supabase
      .from('inventory')
      .update({ stock_quantity: newStock })
      .eq('id', targetId);

    if (stockUpdateErr) {
      setSubmitStatus('⚠️ Transaksi tercatat, tetapi gagal memotong stok: ' + stockUpdateErr.message);
    } else {
      setSubmitStatus('✅ Penjualan berhasil dicatat!');
    }

    setCustomerName('');
    setQuantity(1);
    setTotalPrice('');
    setDeviceId('');
    setNotes('');

    // Cek Peringatan Stok
    checkAndTriggerLowStockModal(newStock);

    fetchData();
  };

  const openUpdateStockModal = () => {
    setModalState({ isOpen: true, actionType: 'updateStock', targetData: null, stockInput: acrylicStock.toString(), pinInput: '', errorMsg: '', isVerifying: false });
  };

  const openDeleteSaleModal = (sale) => {
    setModalState({ isOpen: true, actionType: 'delete', targetData: sale, stockInput: '', pinInput: '', errorMsg: '', isVerifying: false });
  };

  const openUpdateStatusModal = (sale) => {
    setModalState({ isOpen: true, actionType: 'updateStatus', targetData: sale, stockInput: '', pinInput: '', errorMsg: '', isVerifying: false });
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalState(prev => ({ ...prev, isVerifying: true, errorMsg: '' }));

    let newStockVal = 0;
    if (modalState.actionType === 'updateStock') {
      newStockVal = parseInt(modalState.stockInput, 10);
      if (isNaN(newStockVal) || newStockVal < 0) {
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ Jumlah stok harus berupa angka positif!' }));
        return;
      }
    }

    const { data: isValidPin, error: pinError } = await supabase.rpc('verify_sales_pin', {
      input_pin: modalState.pinInput.trim()
    });

    if (pinError) {
      setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ RPC Error: ' + pinError.message }));
      return;
    }

    if (!isValidPin) {
      setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ PIN Admin Salah!' }));
      return;
    }

    const targetId = stockItemRecord?.id || 1;

    if (modalState.actionType === 'updateStock') {
      const { data: updatedRows, error: updateErr } = await supabase
        .from('inventory')
        .update({ stock_quantity: newStockVal })
        .eq('id', targetId)
        .select();

      if (updateErr) {
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ DB Error: ' + updateErr.message }));
        return;
      }

      if (!updatedRows || updatedRows.length === 0) {
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ Baris stok tidak ditemukan di database!' }));
        return;
      }

      // Cek stok setelah update manual
      checkAndTriggerLowStockModal(newStockVal);

    } else if (modalState.actionType === 'delete') {
      const sale = modalState.targetData;
      const { error: delErr } = await supabase.from('sales').delete().eq('id', sale.id);
      
      if (delErr) {
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ Gagal Hapus: ' + delErr.message }));
        return;
      }

      const restoredStock = acrylicStock + (parseInt(sale.quantity, 10) || 1);
      await supabase.from('inventory').update({ stock_quantity: restoredStock }).eq('id', targetId);

    } else if (modalState.actionType === 'updateStatus') {
      const sale = modalState.targetData;
      const { error: statusErr } = await supabase.from('sales').update({ payment_status: selectedNewStatus }).eq('id', sale.id);
      
      if (statusErr) {
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ Gagal Status: ' + statusErr.message }));
        return;
      }
      setEditingSaleId(null);
    }

    setModalState({ isOpen: false, actionType: null, targetData: null, stockInput: '', pinInput: '', errorMsg: '', isVerifying: false });
    fetchData();
  };

  // RUMUS PERHITUNGAN RINGKASAN
  const totalOmzetTotal = salesHistory.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0);
  const totalOmzetLunas = salesHistory.filter(s => s.payment_status === 'Lunas').reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0);
  const totalPiutang = totalOmzetTotal - totalOmzetLunas;
  const totalPapanTerjual = salesHistory.reduce((acc, curr) => acc + (parseInt(curr.quantity, 10) || 0), 0);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>💰 Laporan Penjualan & Income</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Realtime Data Transaksi & Stok</p>
        </div>
        <Link href="/admin" style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
          ⬅️ Dashboard
        </Link>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', display: 'block' }}>📦 Stok Papan Akrilik</span>
          <strong style={{ fontSize: '26px', color: acrylicStock <= 5 ? '#dc2626' : '#0f172a' }}>
            {acrylicStock} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>pcs</span>
          </strong>
        </div>
        <button onClick={openUpdateStockModal} style={{ padding: '10px 16px', fontSize: '12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>
          🔒 Update Stok
        </button>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>➕ Input Penjualan Baru</h3>
        <form onSubmit={handleAddSale} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" required placeholder="Nama Pembeli / Toko" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="number" min="1" max={acrylicStock} required value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            <input type="number" required placeholder="Total Harga Jual (Rp)" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} style={{ flex: 2, padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="ID Akrilik / NFC (Opsional)" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
              <option value="Lunas">✅ Lunas</option>
              <option value="DP 50%">⏳ DP 50%</option>
              <option value="Belum Bayar">❌ Belum Bayar</option>
            </select>
          </div>
          <input type="text" placeholder="Catatan Transaksi" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          <button type="submit" disabled={acrylicStock <= 0} style={{ padding: '12px', backgroundColor: acrylicStock <= 0 ? '#94a3b8' : '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: acrylicStock <= 0 ? 'not-allowed' : 'pointer' }}>
            {acrylicStock <= 0 ? '❌ Stok Akrilik Habis' : '💾 Simpan Penjualan'}
          </button>
        </form>
        {submitStatus && <p style={{ marginTop: '12px', fontSize: '12px', color: submitStatus.startsWith('❌') ? '#dc2626' : '#2563eb', textAlign: 'center', fontWeight: '600' }}>{submitStatus}</p>}
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700' }}>🔍 Filter Periode Income</h3>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Pilih Bulan & Tahun:</label>
          <input type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setStartDate(''); setEndDate(''); }} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        <form onSubmit={handleFilterCustomDate} style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
          <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Atau Cari Tanggal Spesifik:</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="submit" style={{ flex: 2, padding: '8px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Cari Tanggal</button>
            <button type="button" onClick={resetFilter} style={{ flex: 1, padding: '8px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Reset</button>
          </div>
        </form>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          
          <div style={{ gridColumn: 'span 2', paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', display: 'block' }}>🏷️ Total Papan Terjual</span>
            <strong style={{ fontSize: '16px', color: '#0f172a' }}>{totalPapanTerjual} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>pcs</span></strong>
          </div>

          <div>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', display: 'block' }}>💵 Total Omzet Tercatat</span>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Rp {totalOmzetTotal.toLocaleString('id-ID')}</strong>
          </div>
          <div>
            <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '600', display: 'block' }}>✅ Uang Masuk (Lunas)</span>
            <strong style={{ fontSize: '14px', color: '#16a34a' }}>Rp {totalOmzetLunas.toLocaleString('id-ID')}</strong>
          </div>
          {totalPiutang > 0 && (
            <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
              <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: '600' }}>⏳ Belum Dilunasi / Piutang: </span>
              <strong style={{ fontSize: '12px', color: '#dc2626' }}>Rp {totalPiutang.toLocaleString('id-ID')}</strong>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>Riwayat Transaksi ({salesHistory.length})</h3>
          <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>🔄 Refresh</button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat data...</p>
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                  <span>
                    📅 {new Date(sale.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} | Qty: {sale.quantity} Pcs
                  </span>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {editingSaleId === sale.id ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <select value={selectedNewStatus} onChange={(e) => setSelectedNewStatus(e.target.value)} style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <option value="Lunas">✅ Lunas</option>
                          <option value="DP 50%">⏳ DP 50%</option>
                          <option value="Belum Bayar">❌ Belum Bayar</option>
                        </select>
                        <button onClick={() => openUpdateStatusModal(sale)} style={{ padding: '2px 6px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>Simpan (PIN)</button>
                        <button onClick={() => setEditingSaleId(null)} style={{ padding: '2px 6px', backgroundColor: '#cbd5e1', color: '#334155', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>X</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: sale.payment_status === 'Lunas' ? '#dcfce7' : sale.payment_status === 'DP 50%' ? '#fef3c7' : '#fee2e2', color: sale.payment_status === 'Lunas' ? '#15803d' : sale.payment_status === 'DP 50%' ? '#b45309' : '#dc2626', fontWeight: '700' }}>
                          {sale.payment_status}
                        </span>
                        <button onClick={() => { setEditingSaleId(sale.id); setSelectedNewStatus(sale.payment_status); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                          ✏️ Edit Status
                        </button>
                      </div>
                    )}

                    <button onClick={() => openDeleteSaleModal(sale)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                      🗑️ Hapus
                    </button>
                  </div>
                </div>

                {sale.notes && <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>📝 {sale.notes}</p>}
              </div>
            ))}

            {salesHistory.length === 0 && <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>Tidak ada transaksi pada periode ini.</p>}
          </div>
        )}
      </div>

      {/* MODAL WARNING STOK TIPIS (WHATSAPP ALERT) */}
      {waAlertModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '12px' }}>
              ⚠️
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Peringatan Stok Menipis!</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              Sisa stok Papan Akrilik saat ini tinggal <strong>{waAlertModal.stockLeft} pcs</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a
                href={waAlertModal.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWaAlertModal({ isOpen: false, stockLeft: 0, waUrl: '' })}
                style={{ width: '100%', padding: '12px', backgroundColor: '#16a34a', color: '#ffffff', borderRadius: '12px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', boxSizing: 'border-box' }}
              >
                💬 Kirim Laporan via WA
              </a>
              <button
                onClick={() => setWaAlertModal({ isOpen: false, stockLeft: 0, waUrl: '' })}
                style={{ width: '100%', padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PIN & UPDATE STOK */}
      {modalState.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '17px', fontWeight: '700' }}>
              {modalState.actionType === 'updateStock' ? '📦 Update Jumlah Stok' : '🔒 Konfirmasi PIN Admin'}
            </h3>
            <form onSubmit={handleModalSubmit}>
              {modalState.actionType === 'updateStock' && (
                <div style={{ marginBottom: '12px', textAlign: 'left' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Sisa Stok Baru (Hanya Angka):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="Contoh: 10"
                    value={modalState.stockInput}
                    onChange={(e) => setModalState(prev => ({ ...prev, stockInput: e.target.value }))}
                    style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              )}
              
              <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  PIN Admin (6-Digit):
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="••••••"
                  value={modalState.pinInput}
                  onChange={(e) => setModalState(prev => ({ ...prev, pinInput: e.target.value }))}
                  style={{ width: '100%', padding: '10px', fontSize: '16px', textAlign: 'center', letterSpacing: '4px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {modalState.errorMsg && <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>{modalState.errorMsg}</p>}
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setModalState({ isOpen: false, actionType: null, targetData: null, stockInput: '', pinInput: '', errorMsg: '', isVerifying: false })} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={modalState.isVerifying} style={{ flex: 1, padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                  {modalState.isVerifying ? 'Verifikasi...' : 'Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
