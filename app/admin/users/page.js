'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('staff');
  const [permissions, setPermissions] = useState({
    sales: true,
    inventory: false,
    stats_reset: false
  });

  const [editingUserId, setEditingUserId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Modal Verifikasi Super Admin
  const [pinModal, setPinModal] = useState({
    isOpen: false,
    actionType: null, // 'save' atau 'delete'
    targetUser: null,
    superPinInput: '',
    errorMsg: '',
    isVerifying: false
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setUsername('');
    setPin('');
    setRole('staff');
    setPermissions({ sales: true, inventory: false, stats_reset: false });
    setEditingUserId(null);
    setStatusMsg('');
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setName(user.name || '');
    setUsername(user.username || '');
    setPin(''); 
    setRole(user.role || 'staff');
    setPermissions(
      user.permissions || { sales: true, inventory: false, stats_reset: false }
    );
    setStatusMsg('ℹ️ Kosongkan PIN/Password jika tidak ingin mengubahnya.');
  };

  const handleOpenPinModal = (actionType, targetUser = null) => {
    if (actionType === 'save') {
      if (!name || !username) {
        setStatusMsg('❌ Harap isi Nama dan Username!');
        return;
      }
      if (!editingUserId && !pin) {
        setStatusMsg('❌ Harap isi PIN/Password untuk akun baru!');
        return;
      }
    }
    setPinModal({
      isOpen: true,
      actionType,
      targetUser,
      superPinInput: '',
      errorMsg: '',
      isVerifying: false
    });
  };

  const handleConfirmSuperAdminAction = async (e) => {
    e.preventDefault();
    setPinModal(prev => ({ ...prev, isVerifying: true, errorMsg: '' }));

    const inputPinClean = pinModal.superPinInput.trim();

    // Verifikasi PIN Super Admin via RPC Supabase
    const { data: verifyRes, error: rpcErr } = await supabase.rpc('verify_sales_pin', {
      input_pin: inputPinClean
    });

    const isSuperAdminValid = verifyRes && verifyRes[0]?.is_valid && verifyRes[0]?.user_role === 'super_admin';

    if (rpcErr || !isSuperAdminValid) {
      setPinModal(prev => ({
        ...prev,
        isVerifying: false,
        errorMsg: '❌ Akses Ditolak: Membutuhkan PIN/Password Super Admin yang Valid!'
      }));
      return;
    }

    // Eksekusi Tindakan Simpan / Edit / Hapus
    if (pinModal.actionType === 'save') {
      const payload = {
        name,
        username,
        role,
        permissions
      };

      if (pin.trim()) {
        payload.pin = pin.trim();
        payload.password = pin.trim();
      }

      if (editingUserId) {
        const { error: updateErr } = await supabase
          .from('admin_users')
          .update(payload)
          .eq('id', editingUserId);

        if (updateErr) {
          setPinModal(prev => ({ ...prev, isVerifying: false, errorMsg: 'Gagal update: ' + updateErr.message }));
          return;
        }
        setStatusMsg('✅ Akun berhasil diperbarui!');
      } else {
        const { error: insertErr } = await supabase
          .from('admin_users')
          .insert([payload]);

        if (insertErr) {
          setPinModal(prev => ({ ...prev, isVerifying: false, errorMsg: 'Gagal simpan: ' + insertErr.message }));
          return;
        }
        setStatusMsg('✅ Akun baru berhasil ditambahkan!');
      }
      resetForm();
    } else if (pinModal.actionType === 'delete') {
      const target = pinModal.targetUser;
      const { error: delErr } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', target.id);

      if (delErr) {
        setPinModal(prev => ({ ...prev, isVerifying: false, errorMsg: 'Gagal hapus: ' + delErr.message }));
        return;
      }
      setStatusMsg(`🗑️ Akun "${target.name}" berhasil dihapus!`);
    }

    setPinModal({ isOpen: false, actionType: null, targetUser: null, superPinInput: '', errorMsg: '', isVerifying: false });
    fetchUsers();
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>👥 Manajemen Akun Admin</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Kelola Tim &amp; Hak Akses Fitur</p>
        </div>
        <Link href="/admin" style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
          ⬅️ Dashboard
        </Link>
      </div>

      {/* Formulir Tambah / Edit User */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>
          {editingUserId ? '✏️ Edit Akun Staff' : '➕ Tambah Akun Staff Baru'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Nama Lengkap Staff:</label>
            <input type="text" placeholder="Contoh: Budi Santoso" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Username:</label>
              <input type="text" placeholder="budi_sales" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                {editingUserId ? 'PIN Baru (Opsional):' : 'PIN / Password:'}
              </label>
              <input type="password" placeholder="••••••" value={pin} onChange={(e) => setPin(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tipe Role:</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
              <option value="staff">👤 Staff Sales (Terbatas)</option>
              <option value="super_admin">👑 Super Admin (Akses Penuh)</option>
            </select>
          </div>

          {role === 'staff' && (
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>Izin Akses Fitur:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permissions.sales} onChange={(e) => setPermissions(prev => ({ ...prev, sales: e.target.checked }))} />
                  Input &amp; Lihat Penjualan
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permissions.inventory} onChange={(e) => setPermissions(prev => ({ ...prev, inventory: e.target.checked }))} />
                  Update Stok Akrilik
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permissions.stats_reset} onChange={(e) => setPermissions(prev => ({ ...prev, stats_reset: e.target.checked }))} />
                  Reset Statistik Kartu
                </label>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {editingUserId && (
              <button type="button" onClick={resetForm} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Batal
              </button>
            )}
            <button type="button" onClick={() => handleOpenPinModal('save')} style={{ flex: 2, padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              🔒 {editingUserId ? 'Simpan Perubahan' : 'Tambah Akun Staff'}
            </button>
          </div>
        </div>

        {statusMsg && <p style={{ marginTop: '12px', fontSize: '12px', color: statusMsg.startsWith('❌') ? '#dc2626' : statusMsg.startsWith('ℹ️') ? '#2563eb' : '#16a34a', textAlign: 'center', fontWeight: '600' }}>{statusMsg}</p>}
      </div>

      {/* List Daftar User */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700' }}>Daftar Akun Terdaftar ({users.length})</h3>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat daftar akun...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map((u) => (
              <div key={u.id} style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{u.name}</strong>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: u.role === 'super_admin' ? '#fef3c7' : '#e0f2fe', color: u.role === 'super_admin' ? '#b45309' : '#0369a1', fontWeight: '700' }}>
                      {u.role === 'super_admin' ? '👑 Super Admin' : '👤 Staff'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Username: <strong>@{u.username}</strong></span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleEditClick(u)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    ✏️ Edit
                  </button>
                  {u.role !== 'super_admin' && (
                    <button onClick={() => handleOpenPinModal('delete', u)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      🗑️ Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Verifikasi Super Admin */}
      {pinModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '18px', padding: '24px', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '10px' }}>
              🔐
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '700' }}>Otorisasi Super Admin</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              Masukkan <strong>PIN / Password Super Admin</strong> Anda untuk mengonfirmasi perubahan akun ini.
            </p>

            <form onSubmit={handleConfirmSuperAdminAction}>
              <input
                type="password"
                required
                autoFocus
                placeholder="PIN Super Admin"
                value={pinModal.superPinInput}
                onChange={(e) => setPinModal(prev => ({ ...prev, superPinInput: e.target.value }))}
                style={{ width: '100%', padding: '12px', fontSize: '16px', textAlign: 'center', letterSpacing: '4px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '14px', boxSizing: 'border-box', outline: 'none' }}
              />

              {pinModal.errorMsg && <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>{pinModal.errorMsg}</p>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setPinModal({ isOpen: false, actionType: null, targetUser: null, superPinInput: '', errorMsg: '', isVerifying: false })} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  Batal
                </button>
                <button type="submit" disabled={pinModal.isVerifying} style={{ flex: 1, padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                  {pinModal.isVerifying ? 'Verifikasi...' : 'Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
