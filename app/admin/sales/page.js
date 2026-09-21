'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SalesPage() {
  // === STATE AUTENTIKASI & ROLE ===
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState('staff'); // Default 'staff' / 'super_admin'

  const [acrylicStock, setAcrylicStock] = useState(0);
  const [stockItemRecord, setStockItemRecord] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State Penjualan Baru (Input Manual)
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

  // State Modal Input Resi Ekspedisi
  const [resiModal, setResiModal] = useState({
    isOpen: false,
    orderData: null,
    resiInput: '',
    errorMsg: '',
    isSaving: false
  });

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

  // STATE MANAJEMEN KODE PROMO (KUPON)
  const [couponsList, setCouponsList] = useState([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newDiscountAmount, setNewDiscountAmount] = useState('');
  const [couponStatusMsg, setCouponStatusMsg] = useState('');

  // === CEK SESSION & ROLE DARI LOCALSTORAGE ===
  useEffect(() => {
    const savedSession = localStorage.getItem('nfc_admin_session');
    const savedRole = localStorage.getItem('nfc_admin_role') || 'staff';
    const lastActivity = localStorage.getItem('nfc_admin_last_activity');
    const TIMEOUT_DURATION = 10 * 60 * 1000; // 10 Menit

    if (savedSession === 'true' && lastActivity) {
      const now = Date.now();
      if (now - parseInt(lastActivity, 10) < TIMEOUT_DURATION) {
        setIsAuthenticated(true);
        setUserRole(savedRole);
        localStorage.setItem('nfc_admin_last_activity', now.toString());
      } else {
        localStorage.removeItem('nfc_admin_session');
        localStorage.removeItem('nfc_admin_last_activity');
        localStorage.removeItem('nfc_admin_role');
        window.location.href = '/admin';
        return;
      }
    } else {
      window.location.href = '/admin';
      return;
    }
    setAuthChecking(false);
  }, []);

  // REALTIME LISTENER SUPABASE
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchData();
    if (userRole === 'super_admin') {
      fetchCoupons();
    }

    const channel = supabase
      .channel('sales-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => {
        if (userRole === 'super_admin') fetchCoupons();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, selectedMonth, userRole]);

  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCouponsList(data);
  };

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    if (userRole !== 'super_admin') return;
    setCouponStatusMsg('Menyimpan...');

    const { error } = await supabase.from('coupons').insert([{
      code: newCouponCode.trim().toUpperCase(),
      discount_amount: parseFloat(newDiscountAmount) || 0,
      is_active: true
    }]);

    if (error) {
      setCouponStatusMsg('❌ Gagal: ' + error.message);
    } else {
      setCouponStatusMsg('✅ Kode promo berhasil ditambahkan!');
      setNewCouponCode('');
      setNewDiscountAmount('');
      fetchCoupons();
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (userRole !== 'super_admin') return;
    await supabase.from('coupons').delete().eq('id', id);
    fetchCoupons();
  };

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch Stok Akrilik
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

    // 2. Fetch Data Transaksi dari Tabel 'sales'
    let querySales = supabase.from('sales').select('*').order('created_at', { ascending: false });

    if (startDate && endDate) {
      querySales = querySales.gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`);
    } else if (selectedMonth) {
      const year = selectedMonth.split('-')[0];
      const month = selectedMonth.split('-')[1];
      const startOfMonth = `${year}-${month}-01T00:00:00`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${month}-${lastDay}T23:59:59`;

      querySales = querySales.gte('created_at', startOfMonth).lte('created_at', endOfMonth);
    }

    const { data: salesData } = await querySales;

    // 3. Fetch Data Transaksi Web dari Tabel 'orders'
    let queryOrders = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (startDate && endDate) {
      queryOrders = queryOrders.gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`);
    } else if (selectedMonth) {
      const year = selectedMonth.split('-')[0];
      const month = selectedMonth.split('-')[1];
      const startOfMonth = `${year}-${month}-01T00:00:00`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${month}-${lastDay}T23:59:59`;

      queryOrders = queryOrders.gte('created_at', startOfMonth).lte('created_at', endOfMonth);
    }

    const { data: ordersData } = await queryOrders;

    // Format & Gabungkan Data
    const formattedSales = (salesData || []).map(s => ({
      id: s.id,
      primary_id: s.id,
      source: 'manual',
      customer_name: s.customer_name,
      quantity: parseInt(s.quantity, 10) || 1,
      total_price: parseFloat(s.total_price) || 0,
      shipping_cost: parseFloat(s.shipping_cost || 0),
      payment_status: s.payment_status || 'Lunas',
      notes: s.notes,
      resi_number: s.resi_number || null,
      created_at: s.created_at
    }));

    const formattedOrders = (ordersData || []).map(o => {
      let mappedStatus = 'Belum Bayar';
      const statusRaw = (o.payment_status || '').toLowerCase();
      
      if (['selesai', 'finished', 'completed'].includes(statusRaw)) {
        mappedStatus = 'Selesai';
      } else if (['shipped', 'dikirim', 'sedang dikirim'].includes(statusRaw)) {
        mappedStatus = 'Sedang Dikirim';
      } else if (['settlement', 'paid', 'success', 'lunas'].includes(statusRaw)) {
        mappedStatus = 'Lunas';
      } else if (['pending'].includes(statusRaw)) {
        mappedStatus = 'Belum Bayar';
      }

      return {
        id: o.order_id || o.id,
        primary_id: o.id,
        order_id: o.order_id,
        source: 'online',
        customer_name: o.customer_name || 'Pembeli Online',
        quantity: parseInt(o.quantity, 10) || 1,
        total_price: parseFloat(o.total_price) || 0,
        shipping_cost: parseFloat(o.shipping_cost) || 0,
        payment_status: mappedStatus,
        notes: o.courier ? `Kurir: ${o.courier}` : 'Order Web',
        resi_number: o.resi_number || null,
        created_at: o.created_at
      };
    });

    const combinedHistory = [...formattedSales, ...formattedOrders].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    setSalesHistory(combinedHistory);
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

  // === FIX PENTING: INPUT PENJUALAN MANUAL + POTONG STOK AKURAT ===
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

    const insertPayload = {
      customer_name: customerName,
      quantity: qtyNumber,
      total_price: priceNumber,
      device_id: deviceId || null,
      payment_status: paymentStatus,
      notes: notes || null
    };

    let { error: saleError } = await supabase.from('sales').insert([
      { ...insertPayload, shipping_cost: 0 }
    ]);

    if (saleError && saleError.message.includes('shipping_cost')) {
      const fallbackRes = await supabase.from('sales').insert([insertPayload]);
      saleError = fallbackRes.error;
    }

    if (saleError) {
      setSubmitStatus('❌ Gagal mencatat: ' + saleError.message);
      return;
    }

    // HITUNG STOK BARU
    const newStock = Math.max(0, acrylicStock - qtyNumber);

    // Dapatkan ID tabel inventory secara pasti
    const targetInventoryId = stockItemRecord?.id || 1;

    // UPDATE STOK DI TABEL INVENTORY
    const { error: stockUpdateErr } = await supabase
      .from('inventory')
      .update({ 
        stock_quantity: newStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetInventoryId);

    if (stockUpdateErr) {
      setSubmitStatus('⚠️ Transaksi tercatat, tetapi gagal memotong stok: ' + stockUpdateErr.message);
    } else {
      setSubmitStatus('✅ Penjualan berhasil dicatat & stok terpotong!');
      setAcrylicStock(newStock);
    }

    setCustomerName('');
    setQuantity(1);
    setTotalPrice('');
    setDeviceId('');
    setNotes('');

    checkAndTriggerLowStockModal(newStock);
    fetchData();
  };

  const openResiModal = (sale) => {
    setResiModal({
      isOpen: true,
      orderData: sale,
      resiInput: sale.resi_number || '',
      errorMsg: '',
      isSaving: false
    });
  };

  const handleSaveResi = async (e) => {
    e.preventDefault();
    setResiModal(prev => ({ ...prev, isSaving: true, errorMsg: '' }));

    const sale = resiModal.orderData;
    const isOnline = sale.source === 'online';
    const targetTable = isOnline ? 'orders' : 'sales';

    const { error } = await supabase
      .from(targetTable)
      .update({
        resi_number: resiModal.resiInput.trim(),
        payment_status: 'Sedang Dikirim'
      })
      .eq('id', sale.primary_id);

    if (error) {
      setResiModal(prev => ({ ...prev, isSaving: false, errorMsg: '❌ Gagal simpan resi: ' + error.message }));
      return;
    }

    setResiModal({ isOpen: false, orderData: null, resiInput: '', errorMsg: '', isSaving: false });
    fetchData();
  };

  const openUpdateStockModal = () => {
    if (userRole !== 'super_admin') {
      alert("Hanya Super Admin yang bisa mengupdate stok secara manual.");
      return;
    }
    setModalState({ isOpen: true, actionType: 'updateStock', targetData: null, stockInput: acrylicStock.toString(), pinInput: '', errorMsg: '', isVerifying: false });
  };

  const openDeleteSaleModal = (sale) => {
    if (userRole !== 'super_admin') {
      alert("Hanya Super Admin yang bisa menghapus data transaksi.");
      return;
    }
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

    if (pinError || !isValidPin) {
      setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ PIN Admin Salah / Error!' }));
      return;
    }

    const targetId = stockItemRecord?.id || 1;

    if (modalState.actionType === 'updateStock') {
      const { data: updatedRows, error: updateErr } = await supabase
        .from('inventory')
        .update({ 
          stock_quantity: newStockVal,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetId)
        .select();

      if (updateErr || !updatedRows || updatedRows.length === 0) {
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ Gagal update stok di database!' }));
        return;
      }

      checkAndTriggerLowStockModal(newStockVal);

    } else if (modalState.actionType === 'delete') {
      const sale = modalState.targetData;
      const isOnline = sale.source === 'online';
      const targetTable = isOnline ? 'orders' : 'sales';
      
      const { error: delErr } = await supabase
        .from(targetTable)
        .delete()
        .eq('id', sale.primary_id);

      if (delErr) {
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ Error Supabase: ' + delErr.message }));
        return;
      }

      const restoredStock = acrylicStock + (parseInt(sale.quantity, 10) || 1);
      await supabase.from('inventory').update({ stock_quantity: restoredStock, updated_at: new Date().toISOString() }).eq('id', targetId);

    } else if (modalState.actionType === 'updateStatus') {
      const sale = modalState.targetData;
      const isOnline = sale.source === 'online';
      
      const targetTable = isOnline ? 'orders' : 'sales';
      const { error: statusErr } = await supabase
        .from(targetTable)
        .update({ payment_status: selectedNewStatus })
        .eq('id', sale.primary_id);
      
      if (statusErr) {
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: '❌ Gagal Status: ' + statusErr.message }));
        return;
      }
      setEditingSaleId(null);
    }

    setModalState({ isOpen: false, actionType: null, targetData: null, stockInput: '', pinInput: '', errorMsg: '', isVerifying: false });
    fetchData();
  };

  const totalPapanTerjual = salesHistory.reduce((acc, curr) => acc + (parseInt(curr.quantity, 10) || 0), 0);
  
  const totalOngkirCollected = salesHistory
    .filter(s => ['Lunas', 'Sedang Dikirim', 'Selesai'].includes(s.payment_status))
    .reduce((acc, curr) => acc + (parseFloat(curr.shipping_cost) || 0), 0);

  const totalKeuntunganLunas = salesHistory
    .filter(s => ['Lunas', 'Sedang Dikirim', 'Selesai'].includes(s.payment_status))
    .reduce((acc, curr) => {
      const subtotalBarang = (parseFloat(curr.total_price) || 0) - (parseFloat(curr.shipping_cost) || 0);
      return acc + subtotalBarang;
    }, 0);

  const totalBrutoLunas = totalKeuntunganLunas + totalOngkirCollected;

  const totalPiutang = salesHistory
    .filter(s => !['Lunas', 'Sedang Dikirim', 'Selesai'].includes(s.payment_status))
    .reduce((acc, curr) => {
      const subtotalBarang = (parseFloat(curr.total_price) || 0) - (parseFloat(curr.shipping_cost) || 0);
      return acc + subtotalBarang;
    }, 0);

  if (authChecking || !isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>🔒 Memeriksa Hak Akses Admin...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>💰 Laporan Penjualan</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            Login sebagai: <strong style={{ color: userRole === 'super_admin' ? '#2563eb' : '#16a34a' }}>{userRole === 'super_admin' ? 'Super Admin' : 'Admin Staff'}</strong>
          </p>
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
        {userRole === 'super_admin' && (
          <button onClick={openUpdateStockModal} style={{ padding: '10px 16px', fontSize: '12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>
            🔒 Update Stok
          </button>
        )}
      </div>

      {/* MANAJEMEN KODE PROMO - HANYA SUPER ADMIN */}
      {userRole === 'super_admin' && (
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>🎟️ Kelola Kode Promo / Diskon (Flat Rp)</h3>
          
          <form onSubmit={handleAddCoupon} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="text" 
              required 
              placeholder="Kode (misal: DISKON40K)" 
              value={newCouponCode} 
              onChange={(e) => setNewCouponCode(e.target.value)} 
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
            />
            <input 
              type="number" 
              required 
              placeholder="Potongan Rp" 
              value={newDiscountAmount} 
              onChange={(e) => setNewDiscountAmount(e.target.value)} 
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
            />
            <button type="submit" style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
              + Tambah
            </button>
          </form>
          {couponStatusMsg && <p style={{ fontSize: '12px', textAlign: 'center', marginBottom: '12px', fontWeight: 'bold', color: couponStatusMsg.startsWith('❌') ? '#dc2626' : '#16a34a' }}>{couponStatusMsg}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {couponsList.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <div>
                  <strong style={{ color: '#2563eb', fontFamily: 'monospace', fontSize: '14px' }}>{c.code}</strong>
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>- Rp {parseFloat(c.discount_amount).toLocaleString('id-ID')}</span>
                </div>
                <button onClick={() => handleDeleteCoupon(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>🗑️ Hapus</button>
              </div>
            ))}
            {couponsList.length === 0 && <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, textAlign: 'center' }}>Belum ada kode promo aktif.</p>}
          </div>
        </div>
      )}

      {/* FORM INPUT MANUAL */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>➕ Input Penjualan Manual (Offline)</h3>
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
              <option value="Sedang Dikirim">🚚 Sedang Dikirim</option>
              <option value="Selesai">🎉 Selesai</option>
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

      {/* FILTER PERIODE */}
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

      {/* KARTU STATISTIK */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          
          <div style={{ gridColumn: 'span 2', paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', display: 'block' }}>🏷️ Total Papan Terjual</span>
            <strong style={{ fontSize: '16px', color: '#0f172a' }}>{totalPapanTerjual} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>pcs</span></strong>
          </div>

          <div>
            <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700', display: 'block' }}>💰 Keuntungan Murni (Lunas)</span>
            <strong style={{ fontSize: '15px', color: '#16a34a' }}>Rp {totalKeuntunganLunas.toLocaleString('id-ID')}</strong>
            <span style={{ fontSize: '9px', color: '#64748b', display: 'block', marginTop: '2px' }}>*Tidak termasuk ongkir</span>
          </div>

          <div>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', display: 'block' }}>🚚 Biaya Ongkir Ekspedisi</span>
            <strong style={{ fontSize: '14px', color: '#475569' }}>Rp {totalOngkirCollected.toLocaleString('id-ID')}</strong>
            <span style={{ fontSize: '9px', color: '#64748b', display: 'block', marginTop: '2px' }}>*Titipan ekspedisi</span>
          </div>

          <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#334155', fontWeight: '600' }}>💵 Total Kas Masuk Bruto:</span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>Rp {totalBrutoLunas.toLocaleString('id-ID')}</strong>
          </div>

          {totalPiutang > 0 && (
            <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
              <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: '600' }}>⏳ Belum Dilunasi / Piutang: </span>
              <strong style={{ fontSize: '12px', color: '#dc2626' }}>Rp {totalPiutang.toLocaleString('id-ID')}</strong>
            </div>
          )}
        </div>

        {/* DAFTAR TRANSAKSI */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>Riwayat Transaksi ({salesHistory.length})</h3>
          <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>🔄 Refresh</button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat data...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {salesHistory.map((sale) => {
              const subtotalBarang = sale.total_price - sale.shipping_cost;

              return (
                <div key={`${sale.source}-${sale.primary_id}`} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div>
                      <strong style={{ fontSize: '14px' }}>{sale.customer_name}</strong>
                      {sale.source === 'online' && (
                        <span style={{ marginLeft: '6px', fontSize: '10px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                          WEB ONLINE
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#16a34a', display: 'block' }}>
                        Rp {subtotalBarang.toLocaleString('id-ID')}
                      </span>
                      {sale.shipping_cost > 0 && (
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          + Ongkir: Rp {sale.shipping_cost.toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                    <span>
                      📅 {new Date(sale.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} | Qty: {sale.quantity} Pcs
                    </span>
                    
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => openResiModal(sale)}
                        style={{
                          backgroundColor: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        🚚 {sale.resi_number ? 'Edit Resi' : 'Input Resi'}
                      </button>

                      {editingSaleId === sale.primary_id ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <select value={selectedNewStatus} onChange={(e) => setSelectedNewStatus(e.target.value)} style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <option value="Lunas">✅ Lunas</option>
                            <option value="Sedang Dikirim">🚚 Sedang Dikirim</option>
                            <option value="Selesai">🎉 Selesai</option>
                            <option value="DP 50%">⏳ DP 50%</option>
                            <option value="Belum Bayar">❌ Belum Bayar</option>
                          </select>
                          <button onClick={() => openUpdateStatusModal(sale)} style={{ padding: '2px 6px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>Simpan</button>
                          <button onClick={() => setEditingSaleId(null)} style={{ padding: '2px 6px', backgroundColor: '#cbd5e1', color: '#334155', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>X</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: sale.payment_status === 'Selesai' ? '#dcfce7' : sale.payment_status === 'Sedang Dikirim' ? '#e0f2fe' : sale.payment_status === 'Lunas' ? '#dcfce7' : sale.payment_status === 'DP 50%' ? '#fef3c7' : '#fee2e2',
                            color: sale.payment_status === 'Selesai' ? '#15803d' : sale.payment_status === 'Sedang Dikirim' ? '#0284c7' : sale.payment_status === 'Lunas' ? '#15803d' : sale.payment_status === 'DP 50%' ? '#b45309' : '#dc2626',
                            fontWeight: '700'
                          }}>
                            {sale.payment_status}
                          </span>
                          <button onClick={() => { setEditingSaleId(sale.primary_id); setSelectedNewStatus(sale.payment_status); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                            ✏️
                          </button>
                        </div>
                      )}
                      
                      {userRole === 'super_admin' && (
                        <button onClick={() => openDeleteSaleModal(sale)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {sale.resi_number && (
                    <div style={{ marginTop: '6px', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: '#1d4ed8', fontWeight: '600' }}>
                      📦 No. Resi: <span style={{ fontFamily: 'monospace' }}>{sale.resi_number}</span>
                    </div>
                  )}

                  {sale.notes && <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>📝 {sale.notes}</p>}
                </div>
              );
            })}

            {salesHistory.length === 0 && <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>Tidak ada transaksi pada periode ini.</p>}
          </div>
        )}
      </div>

      {/* MODAL INPUT RESI */}
      {resiModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '700', textAlign: 'center' }}>
              🚚 Input Nomor Resi
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
              Order untuk: <strong>{resiModal.orderData?.customer_name}</strong>
            </p>

            <form onSubmit={handleSaveResi}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Nomor Resi Ekspedisi (J&T / SiCepat / POS):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: JNT123456789"
                  value={resiModal.resiInput}
                  onChange={(e) => setResiModal(prev => ({ ...prev, resiInput: e.target.value }))}
                  style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {resiModal.errorMsg && <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#ef4444', fontWeight: '600', textAlign: 'center' }}>{resiModal.errorMsg}</p>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setResiModal({ isOpen: false, orderData: null, resiInput: '', errorMsg: '', isSaving: false })} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Batal</button>
                <button type="submit" disabled={resiModal.isSaving} style={{ flex: 1, padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                  {resiModal.isSaving ? 'Simpan...' : 'Simpan Resi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PIN & HAPUS / UPDATE */}
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
