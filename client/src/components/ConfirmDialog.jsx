import React, { useEffect, useRef } from 'react';

/**
 * Modern ConfirmDialog — replaces window.confirm()
 *
 * Props:
 *   isOpen      {bool}     — controls visibility
 *   title       {string}   — dialog heading
 *   message     {string}   — body text (can include JSX)
 *   confirmText {string}   — confirm button label (default: "Confirm")
 *   cancelText  {string}   — cancel button label (default: "Cancel")
 *   type        {string}   — 'danger' | 'warning' | 'info' (default: 'danger')
 *   onConfirm   {fn}       — called when user confirms
 *   onCancel    {fn}       — called when user cancels / closes
 */
const TYPES = {
  danger: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    iconBg: '#fef2f2',
    iconColor: '#ef4444',
    confirmBg: '#ef4444',
    confirmHover: '#dc2626',
  },
  warning: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    iconBg: '#fffbeb',
    iconColor: '#f59e0b',
    confirmBg: '#f59e0b',
    confirmHover: '#d97706',
  },
  info: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    iconBg: '#eff6ff',
    iconColor: '#3b82f6',
    confirmBg: '#111',
    confirmHover: '#333',
  },
};

const ConfirmDialog = ({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef(null);
  const cfg = TYPES[type] || TYPES.danger;

  // Focus cancel button on open, close on Escape
  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current?.focus();
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes cdBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cdSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, zIndex: 99990,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(3px)',
          animation: 'cdBackdropIn 0.2s ease',
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        style={{
          position: 'fixed', inset: 0, zIndex: 99991,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 24px 60px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
            width: '100%',
            maxWidth: 420,
            padding: '28px 28px 24px',
            pointerEvents: 'auto',
            animation: 'cdSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Icon + Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: cfg.iconBg, color: cfg.iconColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {cfg.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
              <p id="cd-title" style={{
                margin: 0, fontSize: 15, fontWeight: 800,
                color: '#111', letterSpacing: '-0.2px', lineHeight: 1.3,
              }}>
                {title}
              </p>
              {message && (
                <p style={{
                  margin: '8px 0 0', fontSize: 13, color: '#555',
                  lineHeight: 1.55, fontWeight: 400,
                }}>
                  {message}
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#f0f0f0', margin: '0 -28px 20px' }} />

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              ref={cancelRef}
              onClick={onCancel}
              style={{
                padding: '9px 20px',
                fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                textTransform: 'uppercase',
                background: '#fff',
                border: '1.5px solid #e0e0e0',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#555',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.target.style.borderColor = '#aaa'; e.target.style.color = '#111'; }}
              onMouseLeave={e => { e.target.style.borderColor = '#e0e0e0'; e.target.style.color = '#555'; }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '9px 20px',
                fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                textTransform: 'uppercase',
                background: cfg.confirmBg,
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'background 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => { e.target.style.background = cfg.confirmHover; }}
              onMouseLeave={e => { e.target.style.background = cfg.confirmBg; }}
              onMouseDown={e => { e.target.style.transform = 'scale(0.97)'; }}
              onMouseUp={e => { e.target.style.transform = 'scale(1)'; }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;
