// Smaug – Shared UI Components
(function () {
  const { useState, useEffect, useRef } = React;

  function Button({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', style }) {
    return (
      <button className={`s-btn s-btn-${variant} s-btn-${size}`} onClick={onClick} disabled={disabled} type={type} style={style}>
        {children}
      </button>
    );
  }

  function Input({ label, value, onChange, type = 'text', placeholder, error, required, min, max, step, autoFocus }) {
    return (
      <div className="s-field">
        {label && <label className="s-label">{label}{required && <span className="s-req"> *</span>}</label>}
        <input
          className={`s-input${error ? ' s-input-err' : ''}`}
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder} min={min} max={max} step={step}
          autoFocus={autoFocus}
        />
        {error && <span className="s-err-msg">{error}</span>}
      </div>
    );
  }

  function Select({ label, value, onChange, options, required, error, placeholder }) {
    return (
      <div className="s-field">
        {label && <label className="s-label">{label}{required && <span className="s-req"> *</span>}</label>}
        <select className={`s-select${error ? ' s-input-err' : ''}`} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">{placeholder || 'Selecione...'}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <span className="s-err-msg">{error}</span>}
      </div>
    );
  }

  function Row({ children, gap = 12 }) {
    return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${React.Children.count(children)}, 1fr)`, gap }}>{children}</div>;
  }

  function Modal({ title, onClose, children, footer, width = 480 }) {
    useEffect(() => {
      const h = e => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', h);
      document.body.style.overflow = 'hidden';
      return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
    }, []);

    return (
      <div className="s-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="s-modal" style={{ maxWidth: width }}>
          <div className="s-modal-hd">
            <h3 className="s-modal-title">{title}</h3>
            <button className="s-modal-close" onClick={onClose} aria-label="Fechar">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="s-modal-bd">{children}</div>
          {footer && <div className="s-modal-ft">{footer}</div>}
        </div>
      </div>
    );
  }

  function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = 'Excluir', danger = true }) {
    return (
      <Modal title="Confirmar ação" onClose={onCancel} width={400} footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      }>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{message}</p>
      </Modal>
    );
  }

  function Badge({ type }) {
    const MAP = {
      avulsa:      { label: 'Avulsa',      cls: 'badge-avulsa' },
      fixa:        { label: 'Fixa',        cls: 'badge-fixa' },
      parcelada:   { label: 'Parcelada',   cls: 'badge-parcelada' },
      recorrente:  { label: 'Recorrente',  cls: 'badge-recorrente' },
      alterable:   { label: 'Alterável',   cls: 'badge-alt' },
      unalterable: { label: 'Inalterável', cls: 'badge-unalt' },
    };
    const m = MAP[type] || { label: type, cls: '' };
    return <span className={`s-badge ${m.cls}`}>{m.label}</span>;
  }

  function Tabs({ tabs, active, onChange }) {
    return (
      <div className="s-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`s-tab${active === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)}>
            {t.label}
            {t.count != null && <span className="s-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>
    );
  }

  function PageHeader({ title, subtitle, action }) {
    return (
      <div className="s-page-hd">
        <div>
          <h1 className="s-page-title">{title}</h1>
          {subtitle && <p className="s-page-sub">{subtitle}</p>}
        </div>
        {action}
      </div>
    );
  }

  function EmptyState({ icon, message, action }) {
    return (
      <div className="s-empty">
        <div className="s-empty-icon">{icon}</div>
        <p className="s-empty-msg">{message}</p>
        {action && <div style={{ marginTop: 12 }}>{action}</div>}
      </div>
    );
  }

  function Table({ columns, rows, onEdit, onDelete, emptyMessage }) {
    if (!rows.length) return <p className="s-table-empty">{emptyMessage || 'Nenhum registro encontrado.'}</p>;
    return (
      <div className="s-table-wrap">
        <table className="s-table">
          <thead>
            <tr>{columns.map(c => <th key={c.key} style={c.style}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map(c => <td key={c.key} style={c.style}>{c.render ? c.render(row) : row[c.key]}</td>)}
                {(onEdit || onDelete) && (
                  <td className="s-table-actions">
                    {onEdit && <button className="s-action-btn" onClick={() => onEdit(row)} title="Editar">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2L12 4.5 4.5 12H2V9.5L9.5 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                    </button>}
                    {onDelete && <button className="s-action-btn danger" onClick={() => onDelete(row)} title="Excluir">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4.5M8.5 6v4.5M3 3.5l.75 8h6.5l.75-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function MonthYearSelect({ label, month, year, onMonthChange, onYearChange, required, error }) {
    const { MONTH_NAMES_FULL } = window.SmaugData;
    const years = [2025, 2026, 2027, 2028];
    return (
      <div className="s-field">
        {label && <label className="s-label">{label}{required && <span className="s-req"> *</span>}</label>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select className={`s-select${error ? ' s-input-err' : ''}`} value={month} onChange={e => onMonthChange(Number(e.target.value))}>
            {MONTH_NAMES_FULL.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
          </select>
          <select className="s-select" value={year} onChange={e => onYearChange(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {error && <span className="s-err-msg">{error}</span>}
      </div>
    );
  }

  Object.assign(window, {
    SBtn: Button, SInput: Input, SSelect: Select, SRow: Row,
    SModal: Modal, SConfirm: ConfirmModal, SBadge: Badge,
    STabs: Tabs, SPageHeader: PageHeader, SEmpty: EmptyState,
    STable: Table, SMonthYear: MonthYearSelect,
  });
})();
