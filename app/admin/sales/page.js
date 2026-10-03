'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  Wallet, Package, ShoppingBag, TrendingUp, Banknote, RefreshCw, Lock, Plus, Ticket, Trash2, Truck, Pencil, Check, X,
  CalendarDays, Search, Globe, Store, StickyNote, AlertTriangle, MessageCircle, Filter, Receipt, MapPin, Loader2,
} from 'lucide-react';
import {
  PageContainer, PageHeader, Panel, KpiCard, Pill, Field, TextInput, SelectInput, Btn, Modal, PinField, useToast, EmptyState, Skeleton, Th, Td, formatRupiah, formatRupiahCompact,
} from '@/components/admin/kit';
import { ResiTimeline, useResiTracker } from '@/components/resi-tracker';

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
  const { showToast, ToastViewport } = useToast();
  const resiTracker = useResiTracker();
  const [trackSale, setTrackSale] = useState(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyStatus, setHistoryStatus] = useState('all');

  // === CEK SESSION & ROLE VIA HTTPONLY COOKIE (/api/auth/me) ===
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setIsAuthenticated(true);
          setUserRole(data.user.role || 'staff');
        } else {
          window.location.href = '/admin?reason=login_required';
          return;
        }
      })
      .catch(() => { window.location.href = '/admin?reason=login_required'; })
      .finally(() => setAuthChecking(false));
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
      setCouponStatusMsg('');
      showToast('Gagal: ' + error.message, 'error');
    } else {
      setCouponStatusMsg('');
      showToast('Kode promo berhasil ditambahkan.');
      setNewCouponCode('');
      setNewDiscountAmount('');
      fetchCoupons();
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (userRole !== 'super_admin') return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) showToast('Gagal hapus kupon: ' + error.message, 'error');
    else showToast('Kode promo dihapus.', 'error');
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
        courier: o.courier || '',
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
    const ADMIN_PHONE = '6285183144404';

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
      setSubmitStatus('Stok Akrilik tidak mencukupi!');
      showToast('Stok Akrilik tidak mencukupi!', 'error');
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
      setSubmitStatus('');
      showToast('Gagal mencatat: ' + saleError.message, 'error');
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
      setSubmitStatus('');
      showToast('Transaksi tercatat, tetapi gagal memotong stok: ' + stockUpdateErr.message, 'error');
    } else {
      setSubmitStatus('');
      showToast('Penjualan berhasil dicatat & stok terpotong.');
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
      setResiModal(prev => ({ ...prev, isSaving: false, errorMsg: 'Gagal simpan resi: ' + error.message }));
      return;
    }

    setResiModal({ isOpen: false, orderData: null, resiInput: '', errorMsg: '', isSaving: false });
    showToast('Nomor resi tersimpan · status jadi Sedang Dikirim.');
    fetchData();
  };

  const openUpdateStockModal = () => {
    if (userRole !== 'super_admin') {
      showToast("Hanya Super Admin yang bisa mengupdate stok secara manual.", "error");
      return;
    }
    setModalState({ isOpen: true, actionType: 'updateStock', targetData: null, stockInput: acrylicStock.toString(), pinInput: '', errorMsg: '', isVerifying: false });
  };

  const openDeleteSaleModal = (sale) => {
    if (userRole !== 'super_admin') {
      showToast("Hanya Super Admin yang bisa menghapus data transaksi.", "error");
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
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: 'Jumlah stok harus berupa angka positif.' }));
        return;
      }
    }

    const { data: isValidPin, error: pinError } = await supabase.rpc('verify_sales_pin', {
      input_pin: modalState.pinInput.trim()
    });

    // RPC mengembalikan array [{ is_valid, user_role }] — cek is_valid, bukan sekadar truthy
    const pinOk = Array.isArray(isValidPin) ? isValidPin[0]?.is_valid === true : isValidPin === true;
    if (pinError || !pinOk) {
      setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: 'PIN Admin salah atau tidak valid.' }));
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
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: 'Gagal update stok di database.' }));
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
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: 'Error Supabase: ' + delErr.message }));
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
        setModalState(prev => ({ ...prev, isVerifying: false, errorMsg: 'Gagal update status: ' + statusErr.message }));
        return;
      }
      setEditingSaleId(null);
    }

    const doneMsg = modalState.actionType === 'updateStock' ? 'Stok berhasil diperbarui.' : modalState.actionType === 'delete' ? 'Transaksi dihapus & stok dikembalikan.' : 'Status transaksi diperbarui.';
    showToast(doneMsg, modalState.actionType === 'delete' ? 'error' : 'success');
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

  const PAID = ['Lunas', 'Sedang Dikirim', 'Selesai'];
  const STATUS_OPTIONS = ['Lunas', 'Sedang Dikirim', 'Selesai', 'DP 50%', 'Belum Bayar'];
  const STATUS_TONE = { Selesai: 'green', Lunas: 'green', 'Sedang Dikirim': 'sky', 'DP 50%': 'amber', 'Belum Bayar': 'red' };
  const isSuper = userRole === 'super_admin';
  const EMPTY_MODAL = { isOpen: false, actionType: null, targetData: null, stockInput: '', pinInput: '', errorMsg: '', isVerifying: false };
  const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const periodLabel = startDate && endDate
    ? `${fmtDate(startDate)} – ${fmtDate(endDate)}`
    : selectedMonth ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'Semua';

  if (authChecking || !isAuthenticated) {
    return (
      <PageContainer>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-80" />
      </PageContainer>
    );
  }

  const filteredHistory = salesHistory.filter((s) => {
    const q = historyQuery.toLowerCase();
    const matchQ = !q || (s.customer_name || '').toLowerCase().includes(q) || String(s.id || '').toLowerCase().includes(q) || (s.resi_number || '').toLowerCase().includes(q);
    const matchS = historyStatus === 'all' ? true : historyStatus === 'paid' ? PAID.includes(s.payment_status) : !PAID.includes(s.payment_status);
    return matchQ && matchS;
  });
  const paidCount = salesHistory.filter((s) => PAID.includes(s.payment_status)).length;

  const StatusCell = ({ sale }) => (
    editingSaleId === sale.primary_id ? (
      <div className="flex items-center gap-1">
        <SelectInput value={selectedNewStatus} onChange={(e) => setSelectedNewStatus(e.target.value)} className="h-8 w-[140px] text-xs sm:text-xs">
          {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </SelectInput>
        <Btn size="icon" variant="success" title="Simpan" onClick={() => openUpdateStatusModal(sale)}><Check /></Btn>
        <Btn size="icon" variant="ghost" title="Batal" onClick={() => setEditingSaleId(null)}><X /></Btn>
      </div>
    ) : (
      <button onClick={() => { setEditingSaleId(sale.primary_id); setSelectedNewStatus(sale.payment_status); }} className="group inline-flex items-center gap-1" title="Ubah status">
        <Pill tone={STATUS_TONE[sale.payment_status] || 'slate'} dot>{sale.payment_status}</Pill>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
      </button>
    )
  );

  const SaleActions = ({ sale }) => (
    <div className="flex items-center justify-end gap-0.5">
      {sale.resi_number && sale.source === 'online' && (
        <Btn size="sm" variant="secondary" data-testid={`track-${sale.primary_id}`} onClick={() => { setTrackSale(sale); resiTracker.track({ resi: sale.resi_number, courier: sale.courier, orderDbId: sale.primary_id }); }}><MapPin /> Lacak</Btn>
      )}
      <Btn size="sm" variant="outline" onClick={() => openResiModal(sale)} data-testid={`resi-${sale.primary_id}`}><Truck /> {sale.resi_number ? 'Edit Resi' : 'Input Resi'}</Btn>
      {isSuper && <Btn size="icon" variant="danger-soft" title="Hapus transaksi" onClick={() => openDeleteSaleModal(sale)}><Trash2 /></Btn>}
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        icon={Wallet}
        eyebrow={isSuper ? 'Super Admin' : 'Staff Admin'}
        title="Laporan Penjualan"
        description={`Order web & penjualan offline · Periode ${periodLabel}`}
        actions={
          <>
            <Btn variant="outline" onClick={fetchData} data-testid="sales-refresh"><RefreshCw /> Refresh</Btn>
            {isSuper && <Btn variant="gradient" onClick={openUpdateStockModal} data-testid="update-stock-btn"><Lock /> Update Stok</Btn>}
          </>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard testId="kpi-stock" label="Stok Papan Akrilik" value={acrylicStock} suffix="pcs" icon={Package} tone={acrylicStock <= 5 ? 'rose' : 'amber'} hint={acrylicStock <= 5 ? 'Stok menipis — segera restock' : 'Stok aman'} hintTone={acrylicStock <= 5 ? 'bad' : 'good'} />
        <KpiCard testId="kpi-sold" label="Papan Terjual" value={loading ? '—' : totalPapanTerjual} suffix="pcs" icon={ShoppingBag} tone="indigo" hint={`${salesHistory.length} transaksi · ${paidCount} lunas`} />
        <KpiCard testId="kpi-profit" label="Keuntungan Murni" value={loading ? '—' : formatRupiahCompact(totalKeuntunganLunas)} icon={TrendingUp} tone="emerald" hint="Lunas, tidak termasuk ongkir" />
        <KpiCard testId="kpi-bruto" label="Kas Masuk Bruto" value={loading ? '—' : formatRupiahCompact(totalBrutoLunas)} icon={Banknote} tone="violet" hint={`Ongkir titipan ${formatRupiah(totalOngkirCollected)}`} />
      </div>

      {totalPiutang > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" data-testid="piutang-banner">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Belum dilunasi / piutang periode ini: <b>{formatRupiah(totalPiutang)}</b></span>
        </div>
      )}

      {/* FILTER PERIODE */}
      <Panel bodyClassName="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <Field label="Bulan & Tahun" className="lg:w-52">
            <TextInput type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setStartDate(''); setEndDate(''); }} data-testid="filter-month" />
          </Field>
          <div className="hidden lg:block pb-2.5 text-xs font-medium text-muted-foreground">atau</div>
          <form onSubmit={handleFilterCustomDate} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid flex-1 grid-cols-2 gap-3">
              <Field label="Dari tanggal" className="min-w-0"><TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
              <Field label="Sampai tanggal" className="min-w-0"><TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
            </div>
            <div className="flex gap-2">
              <Btn type="submit" className="flex-1 sm:flex-none"><CalendarDays /> Cari Tanggal</Btn>
              <Btn type="button" variant="outline" onClick={resetFilter}>Reset</Btn>
            </div>
          </form>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {/* LEFT: form + kupon */}
        <div className="space-y-4 min-w-0">
          <Panel title="Input Penjualan Manual" description="Transaksi offline · stok otomatis terpotong" actions={<Store className="h-4 w-4 text-primary" />}>
            <form onSubmit={handleAddSale} className="space-y-3" data-testid="sale-form">
              <Field label="Nama Pembeli / Toko"><TextInput required placeholder="Contoh: Kopi Senja" value={customerName} onChange={(e) => setCustomerName(e.target.value)} data-testid="sale-customer" /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Qty"><TextInput type="number" min="1" max={acrylicStock} required value={quantity} onChange={(e) => setQuantity(e.target.value)} data-testid="sale-qty" /></Field>
                <Field label="Total Harga (Rp)" className="col-span-2"><TextInput type="number" required placeholder="50000" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} data-testid="sale-price" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="ID Kartu (opsional)"><TextInput placeholder="NFC-xxxx" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} /></Field>
                <Field label="Status">
                  <SelectInput value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} data-testid="sale-status">
                    {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </SelectInput>
                </Field>
              </div>
              <Field label="Catatan"><TextInput placeholder="Catatan transaksi" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
              {submitStatus && <p className="rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">{submitStatus}</p>}
              <Btn type="submit" variant={acrylicStock <= 0 ? 'secondary' : 'success'} className="w-full" disabled={acrylicStock <= 0} data-testid="sale-submit">
                {acrylicStock <= 0 ? <><Package /> Stok Akrilik Habis</> : <><Plus /> Simpan Penjualan</>}
              </Btn>
            </form>
          </Panel>

          {isSuper && (
            <Panel title="Kode Promo" description="Diskon flat (Rp) untuk checkout web" actions={<Ticket className="h-4 w-4 text-violet-500" />}>
              <form onSubmit={handleAddCoupon} className="grid grid-cols-2 gap-2" data-testid="coupon-form">
                <TextInput required placeholder="DISKON40K" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)} className="font-mono uppercase" data-testid="coupon-code" />
                <TextInput type="number" required placeholder="Potongan Rp" value={newDiscountAmount} onChange={(e) => setNewDiscountAmount(e.target.value)} data-testid="coupon-amount" />
                <Btn type="submit" variant="outline" className="col-span-2" loading={couponStatusMsg === 'Menyimpan...'}><Plus /> Tambah Kode Promo</Btn>
              </form>
              <div className="mt-4 space-y-2">
                {couponsList.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/60 px-3 py-2.5 dark:border-violet-500/30 dark:bg-violet-500/5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Ticket className="h-4 w-4 shrink-0 text-violet-500" />
                      <span className="truncate font-mono text-sm font-bold text-violet-700 dark:text-violet-300">{c.code}</span>
                      <Pill tone="green">- {formatRupiah(c.discount_amount)}</Pill>
                    </div>
                    <Btn size="icon" variant="danger-soft" title="Hapus" onClick={() => handleDeleteCoupon(c.id)}><Trash2 /></Btn>
                  </div>
                ))}
                {couponsList.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">Belum ada kode promo aktif.</p>}
              </div>
            </Panel>
          )}
        </div>

        {/* RIGHT: riwayat */}
        <Panel noPadding className="lg:col-span-2" title="Riwayat Transaksi" description={`${filteredHistory.length} dari ${salesHistory.length} transaksi · ${periodLabel}`} actions={<Receipt className="h-4 w-4 text-primary" />}>
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:px-6">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <TextInput placeholder="Cari pembeli, order ID, atau resi..." value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} className="pl-9" data-testid="history-search" />
            </div>
            <div className="flex rounded-lg border border-border bg-muted/50 p-0.5" data-testid="history-filter">
              {[{ v: 'all', l: 'Semua' }, { v: 'paid', l: 'Lunas' }, { v: 'unpaid', l: 'Belum' }].map((o) => (
                <button key={o.v} onClick={() => setHistoryStatus(o.v)} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${historyStatus === o.v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{o.l}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : filteredHistory.length === 0 ? (
            <EmptyState icon={Receipt} title="Tidak ada transaksi" description="Tidak ada transaksi pada periode / filter ini." />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/40">
                    <tr><Th>Pembeli</Th><Th>Tanggal</Th><Th className="text-right">Nominal</Th><Th>Status</Th><Th className="text-right">Aksi</Th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredHistory.map((sale) => {
                      const subtotal = sale.total_price - sale.shipping_cost;
                      return (
                        <tr key={`${sale.source}-${sale.primary_id}`} className="hover:bg-muted/40 transition-colors" data-testid={`sale-row-${sale.primary_id}`}>
                          <Td className="max-w-[240px]">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold">{sale.customer_name}</span>
                              {sale.source === 'online' ? <Pill tone="indigo"><Globe className="h-3 w-3" /> Web</Pill> : <Pill tone="slate"><Store className="h-3 w-3" /> Offline</Pill>}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                              <span>Qty {sale.quantity}</span>
                              {sale.resi_number && <span className="flex items-center gap-1 font-mono text-sky-600 dark:text-sky-400"><Truck className="h-3 w-3" />{sale.resi_number}</span>}
                              {sale.notes && <span className="truncate italic">· {sale.notes}</span>}
                            </div>
                          </Td>
                          <Td className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(sale.created_at)}</Td>
                          <Td className="text-right whitespace-nowrap">
                            <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatRupiah(subtotal)}</div>
                            {sale.shipping_cost > 0 && <div className="text-[11px] text-muted-foreground">+ ongkir {formatRupiah(sale.shipping_cost)}</div>}
                          </Td>
                          <Td><StatusCell sale={sale} /></Td>
                          <Td><SaleActions sale={sale} /></Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {filteredHistory.map((sale) => {
                  const subtotal = sale.total_price - sale.shipping_cost;
                  return (
                    <div key={`${sale.source}-${sale.primary_id}`} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold">{sale.customer_name}</span>
                            {sale.source === 'online' ? <Pill tone="indigo"><Globe className="h-3 w-3" /> Web</Pill> : <Pill tone="slate">Offline</Pill>}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{fmtDate(sale.created_at)} · Qty {sale.quantity}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="whitespace-nowrap text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatRupiah(subtotal)}</div>
                          {sale.shipping_cost > 0 && <div className="text-[10px] text-muted-foreground">+ ongkir {formatRupiah(sale.shipping_cost)}</div>}
                        </div>
                      </div>
                      {sale.resi_number && <div className="flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"><Truck className="h-3.5 w-3.5" /> {sale.resi_number}</div>}
                      {sale.notes && <p className="flex items-center gap-1.5 text-[11px] italic text-muted-foreground"><StickyNote className="h-3 w-3" /> {sale.notes}</p>}
                      <div className="flex items-center justify-between gap-2">
                        <StatusCell sale={sale} />
                        <SaleActions sale={sale} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* MODAL RESI */}
      <Modal
        open={resiModal.isOpen}
        onClose={() => setResiModal({ isOpen: false, orderData: null, resiInput: '', errorMsg: '', isSaving: false })}
        icon={Truck}
        tone="sky"
        title="Input Nomor Resi"
        description={`Order untuk ${resiModal.orderData?.customer_name || ''} · status otomatis jadi Sedang Dikirim`}
        testId="resi-modal"
      >
        <form onSubmit={handleSaveResi} className="space-y-4">
          <Field label="Nomor Resi Ekspedisi" hint="J&T / SiCepat / POS / JNE">
            <TextInput required autoFocus placeholder="Contoh: JNT123456789" value={resiModal.resiInput} onChange={(e) => setResiModal((prev) => ({ ...prev, resiInput: e.target.value }))} className="h-11 font-mono" data-testid="resi-input" />
          </Field>
          {resiModal.errorMsg && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{resiModal.errorMsg}</p>}
          <div className="flex gap-2">
            <Btn type="button" variant="outline" className="flex-1" onClick={() => setResiModal({ isOpen: false, orderData: null, resiInput: '', errorMsg: '', isSaving: false })}>Batal</Btn>
            <Btn type="submit" className="flex-1" loading={resiModal.isSaving} data-testid="resi-submit">Simpan Resi</Btn>
          </div>
        </form>
      </Modal>

      {/* MODAL PIN */}
      <Modal
        open={modalState.isOpen}
        onClose={() => setModalState(EMPTY_MODAL)}
        icon={modalState.actionType === 'updateStock' ? Package : modalState.actionType === 'delete' ? Trash2 : Lock}
        tone={modalState.actionType === 'delete' ? 'rose' : modalState.actionType === 'updateStock' ? 'amber' : 'indigo'}
        title={modalState.actionType === 'updateStock' ? 'Update Jumlah Stok' : modalState.actionType === 'delete' ? 'Hapus Transaksi' : 'Ubah Status Transaksi'}
        description={
          modalState.actionType === 'delete' ? `Transaksi ${modalState.targetData?.customer_name || ''} akan dihapus & stok dikembalikan.`
            : modalState.actionType === 'updateStatus' ? `Ubah status menjadi "${selectedNewStatus}". Konfirmasi dengan PIN Admin.`
              : 'Masukkan sisa stok baru, lalu konfirmasi dengan PIN Admin.'
        }
        testId="sales-pin-modal"
      >
        <form onSubmit={handleModalSubmit} autoComplete="off" className="space-y-4">
          {modalState.actionType === 'updateStock' && (
            <Field label="Sisa stok baru (pcs)">
              <TextInput type="number" min="0" step="1" required placeholder="Contoh: 10" value={modalState.stockInput} onChange={(e) => setModalState((prev) => ({ ...prev, stockInput: e.target.value }))} className="h-11 text-center text-base font-semibold" data-testid="stock-input" />
            </Field>
          )}
          <Field label="PIN Admin">
            <PinField testId="sales-pin-input" danger={modalState.actionType === 'delete'} value={modalState.pinInput} onChange={(e) => setModalState((prev) => ({ ...prev, pinInput: e.target.value }))} />
          </Field>
          {modalState.errorMsg && <p data-testid="sales-pin-error" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{modalState.errorMsg}</p>}
          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="outline" className="flex-1" onClick={() => setModalState(EMPTY_MODAL)}>Batal</Btn>
            <Btn type="submit" variant={modalState.actionType === 'delete' ? 'danger' : 'primary'} className="flex-1" loading={modalState.isVerifying} data-testid="sales-pin-submit">Konfirmasi</Btn>
          </div>
        </form>
      </Modal>

      {/* MODAL STOK MENIPIS */}
      <Modal
        open={waAlertModal.isOpen}
        onClose={() => setWaAlertModal({ isOpen: false, stockLeft: 0, waUrl: '' })}
        icon={AlertTriangle}
        tone="rose"
        title="Stok Akrilik Menipis"
        description={`Stok Papan Akrilik tinggal ${waAlertModal.stockLeft} pcs (batas minimum 5 pcs). Segera lakukan restock.`}
        testId="lowstock-modal"
      >
        <div className="flex gap-2">
          <Btn variant="outline" className="flex-1" onClick={() => setWaAlertModal({ isOpen: false, stockLeft: 0, waUrl: '' })}>Nanti</Btn>
          <Btn as="a" href={waAlertModal.waUrl} target="_blank" rel="noreferrer" variant="success" className="flex-1" onClick={() => setWaAlertModal({ isOpen: false, stockLeft: 0, waUrl: '' })}><MessageCircle /> Kirim WA</Btn>
        </div>
      </Modal>

      {/* MODAL LACAK RESI */}
      <Modal
        open={Boolean(trackSale)}
        onClose={() => { setTrackSale(null); resiTracker.reset(); if (resiTracker.data?.orderUpdated) fetchData(); }}
        icon={Truck}
        tone="sky"
        size="md"
        title={`Lacak Paket · ${trackSale?.customer_name || ''}`}
        description={`${trackSale?.courier || 'Kurir'} · Resi ${trackSale?.resi_number || ''}`}
        testId="track-resi-modal"
      >
        {resiTracker.loading ? (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /> Melacak posisi paket...</div>
        ) : (
          <>
            <ResiTimeline data={resiTracker.data} />
            {resiTracker.data?.orderUpdated && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Paket sudah diterima — status order otomatis diubah menjadi Selesai.</p>}
            <Btn variant="outline" className="mt-4 w-full" onClick={() => resiTracker.track({ resi: trackSale.resi_number, courier: trackSale.courier, orderDbId: trackSale.primary_id })}><RefreshCw /> Perbarui</Btn>
          </>
        )}
      </Modal>

      <ToastViewport />
    </PageContainer>
  );
}
