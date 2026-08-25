'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function StatsPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('devices').select('*');
    if (!error && data) {
      setDevices(data);
    }
    setLoading(false);
  };

  // Kalkulasi Total Global
  const totalNfc = devices.reduce((acc, curr) => acc + (curr.nfc_scans || 0), 0);
  const totalQr = devices.reduce((acc, curr) => acc + (curr.qr_scans || 0), 0);
  const totalAll = totalNfc + totalQr;

  const filteredDevices = devices.filter((device) => {
    const query = searchQuery.toLowerCase();
    const idMatch = device.id.toLowerCase().includes(query);
    const labelMatch = device.label_name ? device.label_name.toLowerCase().includes(query) : false;
    return idMatch || labelMatch;
  });

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, sans-serif' }}>
      {/* Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>📊 Statistik Pemakaian</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Analisis Tap NFC vs Scan QR Code</p>
        </div>
        <Link href="/admin" style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
          ⬅️ Kembali ke Admin
        </Link>
      </div>

      {/* Ringkasan Total Global */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL INTERAKSI</span>
          <strong style={{ fontSize: '22px', color: '#0f172a' }}>{totalAll}</strong>
        </div>
        <div style={{ backgroundColor: '#eff6ff', padding: '16px 12px', borderRadius: '12px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#2563eb', display: 'block' }}>📲 TAP NFC</span>
          <strong style={{ fontSize: '22px', color: '#1d4ed8' }}>{totalNfc}</strong>
        </div>
        <div style={{ backgroundColor: '#f0fdf4', padding: '16px 12px', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#16a34a', display: 'block' }}>📷 SCAN QR</span>
          <strong style={{ fontSize: '22px', color: '#15803d' }}>{totalQr}</strong>
        </div>
      </div>

      {/* Form Pencarian */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="🔍 Cari ID atau Nama Toko..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {/* Daftar Kartu & Detail Statistiknya */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Rincian Per Kartu ({filteredDevices.length})</h3>
          <button onClick={fetchStats} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat data statistik...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredDevices.map((device) => {
              const nfc = device.nfc_scans || 0;
              const qr = device.qr_scans || 0;
              const total = nfc + qr;
              const nfcPercent = total > 0 ? Math.round((nfc / total) * 100) : 0;
              const qrPercent = total > 0 ? Math.round((qr / total) * 100) : 0;

              return (
                <div key={device.id} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div>
                      <strong style={{ fontSize: '14px' }}>{device.id}</strong>
                      {device.label_name && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>({device.label_name})</span>}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{total} Total Scan</span>
                  </div>

                  {/* Visual Bar Statistik */}
                  <div style={{ height: '8px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '8px' }}>
                    <div style={{ width: `${nfcPercent}%`, backgroundColor: '#2563eb' }} title={`NFC: ${nfcPercent}%`} />
                    <div style={{ width: `${qrPercent}%`, backgroundColor: '#16a34a' }} title={`QR: ${qrPercent}%`} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                    <span>📲 NFC: <strong>{nfc}</strong> ({nfcPercent}%)</span>
                    <span>📷 QR Code: <strong>{qr}</strong> ({qrPercent}%)</span>
                  </div>
                </div>
              );
            })}

            {filteredDevices.length === 0 && <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>Tidak ada data kartu.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
