import React, { useEffect, useState } from 'react';

const TYPE_CONFIG = {
  success: {
    icon: '✓',
    bar: '#22c55e',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    iconBg: '#22c55e',
    text: '#15803d',
    label: 'Success',
  },
  error: {
    icon: '✕',
    bar: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    iconBg: '#ef4444',
    text: '#b91c1c',
    label: 'Error',
  },
  warning: {
    icon: '!',
    bar: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    iconBg: '#f59e0b',
    text: '#b45309',
    label: 'Warning',
  },
  info: {
    icon: 'i',
    bar: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    iconBg: '#3b82f6',
    text: '#1d4ed8',
    label: 'Info',
  },
};

const Toast = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
    // Start leave animation slightly before removal
    const leaveTimer = setTimeout(() => setLeaving(true), toast.duration - 350);
    return () => clearTimeout(leaveTimer);
  }, [toast.duration]);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 350);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderLeft: `4px solid ${cfg.bar}`,
        borderRadius: 6,
        padding: '12px 14px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        minWidth: 280,
        maxWidth: 360,
        pointerEvents: 'auto',
        position: 'relative',
        overflow: 'hidden',
        opacity: visible && !leaving ? 1 : 0,
        transform: visible && !leaving ? 'translateX(0)' : 'translateX(110%)',
        transition: 'opacity 0.3s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        cursor: 'default',
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: cfg.iconBg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 900, flexShrink: 0, marginTop: 1,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: 2, color: cfg.text, textTransform: 'uppercase', marginBottom: 2 }}>
          {cfg.label}
        </p>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#111', lineHeight: 1.45 }}>
          {toast.message}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#aaa', fontSize: 14, padding: '0 2px',
          flexShrink: 0, lineHeight: 1, marginTop: 1,
        }}
        aria-label="Dismiss"
      >✕</button>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 3,
        background: cfg.bar, borderRadius: '0 0 0 4px',
        animation: `toastProgress ${toast.duration}ms linear forwards`,
      }} />
    </div>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => {
  return (
    <>
      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 72,
        right: 16,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
};

export default ToastContainer;
