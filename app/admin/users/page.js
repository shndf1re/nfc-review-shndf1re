'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, UserPlus, Pencil, Trash2, ShieldCheck, Crown, User, Lock, Info, X, KeyRound } from 'lucide-react';
import {
  PageContainer, PageHeader, Panel, KpiCard, Pill, Field, TextInput, SelectInput, Checkbox, Btn, Modal, PinField, useToast, EmptyState, Skeleton, Th, Td,
} from '@/components/admin/kit';
import { cn } from '@/lib/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const DEFAULT_PERMS = { sales: true, inventory: false, stats_reset: false };
const PERM_LABELS = { sales: 'Penjualan', inventory: 'Stok Akrilik', stats_reset: 'Reset Statistik' };
const EMPTY_PIN = { isOpen: false, actionType: null, targetUser: null, superPinInput: '', errorMsg: '', isVerifying: false };

export default function ManageUsersPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('staff');
  const [permissions, setPermissions] = useState(DEFAULT_PERMS);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formError, setFormError] = useState('');
  const [pinModal, setPinModal] = useState(EMPTY_PIN);
  const { showToast, ToastViewport } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: true });
    if (!error && data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    // AUTH GUARD - cek sesi + role super_admin via httpOnly cookie
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user && data.user.role === 'super_admin') { setIsAuthed(true); fetchUsers(); }
        else window.location.href = '/admin?reason=forbidden';
      })
      .catch(() => { window.location.href = '/admin?reason=login_required'; })
      .finally(() => setAuthChecked(true));
  }, []);

  const resetForm = () => {
    setName(''); setUsername(''); setPassword(''); setPin(''); setRole('staff');
    setPermissions(DEFAULT_PERMS); setEditingUserId(null); setFormError('');
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setName(user.name || '');
    setUsername(user.username || '');
    setPassword(''); setPin('');
    setRole(user.role || 'staff');
    setPermissions(user.permissions || DEFAULT_PERMS);
    setFormError('');
    if (typeof window !== 'undefined' && window.innerWidth < 1024) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPinModal = (actionType, targetUser = null) => {
    if (actionType === 'save') {
      if (!name || !username) return setFormError('Harap isi Nama dan Username.');
      if (!editingUserId && (!password || !pin)) return setFormError('Harap isi Password dan PIN untuk akun baru.');
      if (pin && pin.length > 6) return setFormError('PIN maksimal 6 digit angka.');
    }
    setFormError('');
    setPinModal({ ...EMPTY_PIN, isOpen: true, actionType, targetUser });
  };

  const handleConfirmSuperAdminAction = async (e) => {
    e.preventDefault();
    setPinModal((prev) => ({ ...prev, isVerifying: true, errorMsg: '' }));
    const { data: verifyRes, error: rpcErr } = await supabase.rpc('verify_sales_pin', { input_pin: pinModal.superPinInput.trim() });
    const isSuperAdminValid = verifyRes && verifyRes[0]?.is_valid && verifyRes[0]?.user_role === 'super_admin';
    if (rpcErr || !isSuperAdminValid) {
      setPinModal((prev) => ({ ...prev, isVerifying: false, errorMsg: 'Akses ditolak: butuh PIN/Password Super Admin yang valid.' }));
      return;
    }

    if (pinModal.actionType === 'save') {
      const payload = { name, username, role, permissions };
      if (password.trim()) payload.password = password.trim();
      if (pin.trim()) payload.pin = pin.trim();
      if (editingUserId) {
        const { error: updateErr } = await supabase.from('admin_users').update(payload).eq('id', editingUserId);
        if (updateErr) return setPinModal((prev) => ({ ...prev, isVerifying: false, errorMsg: 'Gagal update: ' + updateErr.message }));
        showToast('Akun berhasil diperbarui.');
      } else {
        const { error: insertErr } = await supabase.from('admin_users').insert([payload]);
        if (insertErr) return setPinModal((prev) => ({ ...prev, isVerifying: false, errorMsg: 'Gagal simpan: ' + insertErr.message }));
        showToast('Akun baru berhasil ditambahkan.');
      }
      resetForm();
    } else if (pinModal.actionType === 'delete') {
      const target = pinModal.targetUser;
      const { error: delErr } = await supabase.from('admin_users').delete().eq('id', target.id);
      if (delErr) return setPinModal((prev) => ({ ...prev, isVerifying: false, errorMsg: 'Gagal hapus: ' + delErr.message }));
      showToast(`Akun "${target.name}" berhasil dihapus.`, 'error');
    }
    setPinModal(EMPTY_PIN);
    fetchUsers();
  };

  if (!authChecked) {
    return <PageContainer><Skeleton className="h-10 w-64" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96" /><Skeleton className="h-96 lg:col-span-2" /></div></PageContainer>;
  }
  if (!isAuthed) return null;

  const superCount = users.filter((u) => u.role === 'super_admin').length;
  const staffCount = users.length - superCount;

  const RoleBadge = ({ r }) => (r === 'super_admin'
    ? <Pill tone="violet"><Crown className="h-3 w-3" /> Super Admin</Pill>
    : <Pill tone="sky"><User className="h-3 w-3" /> Staff</Pill>);

  const PermPills = ({ u }) => {
    if (u.role === 'super_admin') return <span className="text-xs text-muted-foreground">Akses penuh</span>;
    const p = u.permissions || {};
    const on = Object.keys(PERM_LABELS).filter((k) => p[k]);
    if (!on.length) return <span className="text-xs text-muted-foreground">—</span>;
    return <div className="flex flex-wrap gap-1">{on.map((k) => <Pill key={k} tone="slate">{PERM_LABELS[k]}</Pill>)}</div>;
  };

  const Avatar = ({ u }) => (
    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', u.role === 'super_admin' ? 'bg-gradient-to-br from-primary to-violet-500' : 'bg-gradient-to-br from-sky-500 to-cyan-500')}>
      {(u.name || u.username || '?').charAt(0).toUpperCase()}
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        icon={Users}
        eyebrow="Super Admin"
        title="Kelola Tim"
        description="Atur akun admin, role, dan izin akses fitur untuk tim Anda."
        actions={editingUserId ? <Btn variant="outline" onClick={resetForm}><UserPlus /> Tambah Akun Baru</Btn> : null}
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <KpiCard testId="kpi-users" label="Total Akun" value={loading ? '—' : users.length} icon={Users} tone="indigo" />
        <KpiCard testId="kpi-super" label="Super Admin" value={loading ? '—' : superCount} icon={Crown} tone="violet" />
        <KpiCard testId="kpi-staff" label="Staff" value={loading ? '—' : staffCount} icon={User} tone="sky" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        {/* FORM */}
        <Panel
          className={cn('lg:sticky lg:top-20', editingUserId && 'ring-2 ring-primary/30')}
          title={editingUserId ? 'Edit Akun' : 'Tambah Akun Staff'}
          description={editingUserId ? 'Kosongkan Password / PIN jika tidak ingin mengubahnya.' : 'Akun baru butuh password login & PIN otorisasi.'}
          actions={editingUserId ? <Btn variant="ghost" size="icon" onClick={resetForm} title="Batal edit"><X /></Btn> : <UserPlus className="h-4 w-4 text-primary" />}
        >
          <div className="space-y-3.5" data-testid="user-form">
            <Field label="Nama Lengkap"><TextInput data-testid="user-name" placeholder="Contoh: Budi Santoso" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Username Login"><TextInput data-testid="user-username" placeholder="budi_sales" value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={editingUserId ? 'Password Baru' : 'Password Login'}><TextInput data-testid="user-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
              <Field label={editingUserId ? 'PIN Baru' : 'PIN (maks 6 angka)'}><TextInput data-testid="user-pin" type="password" inputMode="numeric" maxLength={6} placeholder="••••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></Field>
            </div>
            <Field label="Role">
              <SelectInput data-testid="user-role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="staff">Staff Sales (Terbatas)</option>
                <option value="super_admin">Super Admin (Akses Penuh)</option>
              </SelectInput>
            </Field>

            {role === 'staff' && (
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold"><KeyRound className="h-3.5 w-3.5 text-primary" /> Izin Akses Fitur</div>
                <div className="space-y-2">
                  {[
                    { k: 'sales', l: 'Input & lihat penjualan' },
                    { k: 'inventory', l: 'Update stok akrilik' },
                    { k: 'stats_reset', l: 'Reset statistik kartu' },
                  ].map(({ k, l }) => (
                    <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-border hover:ring-primary/40">
                      <Checkbox checked={Boolean(permissions?.[k])} onChange={(e) => setPermissions((prev) => ({ ...prev, [k]: e.target.checked }))} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formError && <p data-testid="user-form-error" className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><Info className="h-4 w-4" /> {formError}</p>}

            <div className="flex gap-2 pt-1">
              {editingUserId && <Btn variant="outline" className="flex-1" onClick={resetForm}>Batal</Btn>}
              <Btn data-testid="user-save" variant="gradient" className="flex-[2]" onClick={() => handleOpenPinModal('save')}><Lock /> {editingUserId ? 'Simpan Perubahan' : 'Tambah Akun'}</Btn>
            </div>
          </div>
        </Panel>

        {/* LIST */}
        <Panel noPadding className="lg:col-span-2" title="Daftar Akun Terdaftar" description={`${users.length} akun aktif`}>
          {loading ? (
            <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : users.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada akun" />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/40"><tr><Th>Pengguna</Th><Th>Role</Th><Th>Izin</Th><Th className="text-right">Aksi</Th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u) => (
                      <tr key={u.id} data-testid={`user-row-${u.username}`} className={cn('hover:bg-muted/40 transition-colors', editingUserId === u.id && 'bg-primary/[0.05]')}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar u={u} />
                            <div className="min-w-0"><div className="truncate font-semibold">{u.name}</div><div className="text-xs text-muted-foreground">@{u.username}</div></div>
                          </div>
                        </Td>
                        <Td><RoleBadge r={u.role} /></Td>
                        <Td><PermPills u={u} /></Td>
                        <Td>
                          <div className="flex justify-end gap-0.5">
                            <Btn variant="ghost" size="icon" title="Edit" onClick={() => handleEditClick(u)} data-testid={`user-edit-${u.username}`}><Pencil /></Btn>
                            {u.role !== 'super_admin' && <Btn variant="danger-soft" size="icon" title="Hapus" onClick={() => handleOpenPinModal('delete', u)} data-testid={`user-delete-${u.username}`}><Trash2 /></Btn>}
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-border">
                {users.map((u) => (
                  <div key={u.id} className={cn('flex items-start gap-3 p-4', editingUserId === u.id && 'bg-primary/[0.05]')}>
                    <Avatar u={u} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0"><div className="truncate text-sm font-semibold">{u.name}</div><div className="text-xs text-muted-foreground">@{u.username}</div></div>
                        <RoleBadge r={u.role} />
                      </div>
                      <div className="mt-2"><PermPills u={u} /></div>
                      <div className="mt-2 flex justify-end gap-1">
                        <Btn size="sm" variant="outline" onClick={() => handleEditClick(u)}><Pencil /> Edit</Btn>
                        {u.role !== 'super_admin' && <Btn size="sm" variant="danger-soft" onClick={() => handleOpenPinModal('delete', u)}><Trash2 /> Hapus</Btn>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>

      <Modal
        open={pinModal.isOpen}
        onClose={() => setPinModal(EMPTY_PIN)}
        icon={pinModal.actionType === 'delete' ? Trash2 : ShieldCheck}
        tone={pinModal.actionType === 'delete' ? 'rose' : 'violet'}
        title={pinModal.actionType === 'delete' ? `Hapus Akun · ${pinModal.targetUser?.name || ''}` : 'Otorisasi Super Admin'}
        description="Masukkan PIN / Password Super Admin untuk mengonfirmasi perubahan akun ini."
        testId="users-pin-modal"
      >
        <form onSubmit={handleConfirmSuperAdminAction} autoComplete="off" className="space-y-4">
          <Field label="PIN Super Admin"><PinField testId="users-pin-input" maxLength={64} danger={pinModal.actionType === 'delete'} value={pinModal.superPinInput} onChange={(e) => setPinModal((prev) => ({ ...prev, superPinInput: e.target.value }))} /></Field>
          {pinModal.errorMsg && <p data-testid="users-pin-error" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{pinModal.errorMsg}</p>}
          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="outline" className="flex-1" onClick={() => setPinModal(EMPTY_PIN)}>Batal</Btn>
            <Btn type="submit" variant={pinModal.actionType === 'delete' ? 'danger' : 'primary'} className="flex-1" loading={pinModal.isVerifying} data-testid="users-pin-submit">Konfirmasi</Btn>
          </div>
        </form>
      </Modal>

      <ToastViewport />
    </PageContainer>
  );
}
