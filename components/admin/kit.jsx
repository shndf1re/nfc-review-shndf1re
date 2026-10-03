'use client';

// ============================================================
// NFC Review — Admin UI Kit (SaaS style)
// Dipakai konsisten oleh /admin, /admin/stats, /admin/users, /admin/sales
// Warna: indigo/violet (lihat .admin-theme di globals.css), font Inter
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- Layout primitives ---------- */

export function PageContainer({ className, children }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6', className)}>{children}</div>;
}

export function PageHeader({ title, description, icon: Icon, actions, eyebrow }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-lg shadow-primary/25">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1">{eyebrow}</div>}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, actions, children, className, bodyClassName, noPadding }) {
  return (
    <section className={cn('min-w-0 rounded-2xl border border-border bg-card shadow-sm shadow-slate-900/[0.03]', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div>
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(noPadding ? '' : 'p-4 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  );
}

/* ---------- KPI ---------- */

const TONES = {
  indigo: 'bg-primary/10 text-primary',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  slate: 'bg-muted text-muted-foreground',
};

export function KpiCard({ label, value, suffix, icon: Icon, tone = 'indigo', hint, hintTone, className, testId }) {
  return (
    <div data-testid={testId} className={cn('group relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm shadow-slate-900/[0.03] transition-all hover:shadow-md hover:-translate-y-0.5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-xl sm:text-2xl xl:text-[28px] leading-tight font-bold tracking-tight text-foreground tabular-nums break-words">
            {value}
            {suffix && <span className="ml-1 text-sm font-medium text-muted-foreground">{suffix}</span>}
          </p>
        </div>
        {Icon && (
          <div className={cn('flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl', TONES[tone] || TONES.indigo)}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
      {hint && (
        <p className={cn('mt-3 text-xs', hintTone === 'bad' ? 'text-rose-600 dark:text-rose-400' : hintTone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>{hint}</p>
      )}
    </div>
  );
}

/* ---------- Badges ---------- */

const PILL = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20',
  slate: 'bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
};

export function Pill({ tone = 'slate', dot, children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap', PILL[tone] || PILL.slate, className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ active }) {
  return active ? <Pill tone="green" dot>Aktif</Pill> : <Pill tone="amber" dot>Belum Dipakai</Pill>;
}

/* ---------- Form controls ---------- */

export const inputClass =
  'flex h-10 w-full rounded-lg border border-input bg-card px-3 text-base sm:text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:opacity-50';

export function Field({ label, hint, children, className }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      {label && <span className="text-xs font-medium text-foreground">{label}</span>}
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...props }) {
  return <input className={cn(inputClass, className)} {...props} />;
}

const SELECT_ARROW = "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2394a3b8'%3e%3cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3e%3c/svg%3e\")";

export function SelectInput({ className, children, style, ...props }) {
  return (
    <select
      className={cn(inputClass, 'pr-9 cursor-pointer appearance-none', className)}
      style={{ backgroundImage: SELECT_ARROW, backgroundSize: '1.1rem', backgroundPosition: 'right 0.6rem center', backgroundRepeat: 'no-repeat', ...style }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }) {
  return (
    <input
      type="checkbox"
      className={cn('h-4 w-4 cursor-pointer rounded border-input text-primary accent-[hsl(var(--primary))] focus:ring-primary/30', className)}
      {...props}
    />
  );
}

/* ---------- Buttons (thin wrapper, konsisten di semua halaman) ---------- */

const BTN = {
  primary: 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90',
  gradient: 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-md shadow-primary/25 hover:opacity-95',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border bg-card text-foreground shadow-sm hover:bg-accent',
  ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
  'danger-soft': 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
};
const BTN_SIZE = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
  icon: 'h-8 w-8 rounded-lg',
};

export function Btn({ variant = 'primary', size = 'md', loading, className, children, disabled, as: As = 'button', ...props }) {
  return (
    <As
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
        BTN[variant],
        BTN_SIZE[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </As>
  );
}

/* ---------- Modal (bottom-sheet di HP, dialog di desktop) ---------- */

export function Modal({ open, onClose, title, description, icon: Icon, tone = 'indigo', children, footer, size = 'sm', testId }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === 'lg' ? 'sm:max-w-2xl' : size === 'md' ? 'sm:max-w-lg' : 'sm:max-w-md';
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" data-testid={testId}>
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm animate-in fade-in-0" onClick={onClose} />
      <div className={cn('relative w-full max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in-0 duration-200', width)}>
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border sm:hidden" />
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Tutup">
          <X className="h-4 w-4" />
        </button>
        <div className="px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3 pr-8">
            {Icon && (
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONES[tone] || TONES.indigo)}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          <div className="mt-5">{children}</div>
        </div>
        {footer && <div className="flex gap-2 border-t border-border bg-muted/40 px-5 py-4 sm:px-6 sm:rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

export function PinField({ value, onChange, danger, autoFocus = true, testId, maxLength = 6 }) {
  return (
    <input
      data-testid={testId}
      type="password"
      inputMode={maxLength <= 6 ? 'numeric' : 'text'}
      required
      autoFocus={autoFocus}
      maxLength={maxLength}
      placeholder="••••••"
      value={value}
      onChange={onChange}
      className={cn(
        'h-14 w-full rounded-xl border bg-background text-center text-2xl font-semibold tracking-[0.6em] text-foreground shadow-sm transition placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2',
        danger ? 'border-rose-300 focus-visible:ring-rose-500/30 dark:border-rose-500/40' : 'border-input focus-visible:ring-primary/30 focus-visible:border-primary'
      )}
    />
  );
}

/* ---------- Toast ---------- */

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const showToast = useCallback((message, type = 'success') => {
    const id = ++idRef.current;
    const clean = String(message).replace(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF\s]+/, '');
    setToasts((t) => [...t, { id, message: clean, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  const ToastViewport = () => (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[200] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-5 sm:top-5 sm:items-end">
      {toasts.map((t) => {
        const Icon = t.type === 'error' ? AlertCircle : t.type === 'info' ? Info : CheckCircle2;
        return (
          <div key={t.id} data-testid="toast" className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur animate-in slide-in-from-top-4 fade-in-0">
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', t.type === 'error' ? 'text-rose-500' : t.type === 'info' ? 'text-primary' : 'text-emerald-500')} />
            <p className="flex-1 text-sm font-medium text-foreground">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        );
      })}
    </div>
  );
  return { showToast, ToastViewport };
}

/* ---------- Empty / Skeleton ---------- */

export function EmptyState({ icon: Icon = Inbox, title = 'Belum ada data', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon className="h-6 w-6" /></div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />;
}

/* ---------- Table helpers ---------- */

export function Th({ className, children }) {
  return <th className={cn('px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground', className)}>{children}</th>;
}
export function Td({ className, children, ...props }) {
  return <td className={cn('px-4 py-3.5 text-sm align-middle', className)} {...props}>{children}</td>;
}

export const formatRupiah = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
export const formatRupiahCompact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e9) return 'Rp ' + (v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M';
  if (v >= 1e6) return 'Rp ' + (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' jt';
  return formatRupiah(v);
};
