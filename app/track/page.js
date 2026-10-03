'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Package, CheckCircle2, Clock, XCircle, Truck, MapPin, Phone, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';

const STATUS_META = {
  paid: { label: 'Dibayar', icon: CheckCircle2, color: 'text-chart-2', bg: 'bg-chart-2/10 border-chart-2/30' },
  pending: { label: 'Menunggu Bayar', icon: Clock, color: 'text-chart-3', bg: 'bg-chart-3/10 border-chart-3/30' },
  processing: { label: 'Diproses', icon: Package, color: 'text-primary', bg: 'bg-primary/10 border-primary/30' },
  shipped: { label: 'Dikirim', icon: Truck, color: 'text-chart-4', bg: 'bg-chart-4/10 border-chart-4/30' },
  delivered: { label: 'Selesai', icon: CheckCircle2, color: 'text-chart-2', bg: 'bg-chart-2/10 border-chart-2/30' },
  cancelled: { label: 'Dibatalkan', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' },
};

const getStatus = (s) => STATUS_META[s?.toLowerCase()] || { label: s || 'Unknown', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted border-border' };

export default function TrackOrderPage() {
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPhone = localStorage.getItem('last_customer_phone') || '';
      const savedOrder = localStorage.getItem('last_order_id') || '';
      if (savedPhone) setPhone(savedPhone);
      if (savedOrder) setOrderId(savedOrder);
      if (savedPhone || savedOrder) fetchOrders(savedPhone, savedOrder);
    }
  }, []);

  const fetchOrders = async (searchPhone, searchOrder) => {
    setLoading(true);
    setErrorMsg('');
    setOrders([]);
    setSearched(true);
    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: searchPhone || phone, orderId: searchOrder || orderId }),
      });
      const data = await res.json();
      if (res.ok && data.orders) {
        setOrders(data.orders);
        if (data.orders.length === 0) setErrorMsg('Order tidak ditemukan. Periksa kembali nomor HP atau Order ID.');
      } else {
        setErrorMsg(data.error || 'Terjadi kesalahan.');
      }
    } catch (err) {
      setErrorMsg('Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!phone && !orderId) {
      setErrorMsg('Isi minimal salah satu: Nomor HP atau Order ID.');
      return;
    }
    fetchOrders(phone, orderId);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/app-icon.png" alt="logo" className="h-9 w-9 rounded-xl" />
            <span className="font-bold text-base">NFC Review<span className="text-primary">.</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm"><Link href="/"><ArrowLeft className="h-4 w-4 mr-1.5" /> Beranda</Link></Button>
          </div>
        </div>
      </nav>

      <section className="container py-12 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-4">
            <Package className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Lacak Pesanan</h1>
          <p className="text-muted-foreground">Masukkan nomor HP atau Order ID untuk melihat status pengiriman</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Nomor WhatsApp</label>
                <Input type="tel" placeholder="08xx atau 628xx" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">atau</span></div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> Order ID</label>
                <Input type="text" placeholder="NFC-XXXXXX" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? 'Mencari...' : (<><Search className="h-4 w-4 mr-2" /> Lacak Sekarang</>)}
              </Button>
              {errorMsg && <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-sm text-destructive">{errorMsg}</div>}
            </form>
          </CardContent>
        </Card>

        {orders.length > 0 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Hasil Pencarian ({orders.length})</h2>
            {orders.map((order) => {
              const status = getStatus(order.payment_status);
              const Icon = status.icon;
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base font-semibold font-mono">{order.order_id || order.id}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(order.created_at).toLocaleString('id-ID')}</p>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                        <Icon className="h-3 w-3" /> {status.label}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Nama</span><span className="font-medium">{order.customer_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Jumlah</span><span className="font-medium">{order.quantity} pcs</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold text-primary">Rp {Number(order.total_amount || 0).toLocaleString('id-ID')}</span></div>
                    {order.tracking_number && (
                      <div className="flex justify-between items-center pt-2 border-t border-border">
                        <span className="text-muted-foreground flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Resi</span>
                        <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{order.tracking_number}</code>
                      </div>
                    )}
                    {order.customer_address && (
                      <div className="pt-2 border-t border-border">
                        <div className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Alamat</div>
                        <div className="text-xs">{order.customer_address}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {searched && !loading && orders.length === 0 && !errorMsg && (
          <div className="mt-6 text-center text-muted-foreground text-sm">
            Belum ada hasil. Coba cek kembali data yang Anda masukkan.
          </div>
        )}
      </section>
    </div>
  );
}
