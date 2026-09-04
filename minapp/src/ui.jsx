// ══════════════════════════════════════════════════════════════
//  Shared UI components
// ══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';

export function fmt(n) {
  if (n == null) return '0';
  return new Intl.NumberFormat('fa-IR').format(Math.round(n));
}

export function timeLeft(target) {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function useCountdown(target) {
  const [left, setLeft] = useState(timeLeft(target));
  useEffect(() => {
    const iv = setInterval(() => setLeft(timeLeft(target)), 1000);
    setLeft(timeLeft(target));
    return () => clearInterval(iv);
  }, [target]);
  return left;
}

export function ProgressBar({ percent }) {
  return (
    <div className="progress-bar">
      <div style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

export function RowItem({ emoji, title, sub, side, onClick, badge }) {
  return (
    <div className="row-item" onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className="ri-emoji">{emoji}</div>
      <div className="ri-body">
        <div className="ri-title">{title} {badge}</div>
        {sub && <div className="ri-sub">{sub}</div>}
      </div>
      {side && <div className="ri-side">{side}</div>}
    </div>
  );
}

export function EmptyState({ emoji = '🫧', text }) {
  return (
    <div className="empty-state">
      <span className="e-emoji">{emoji}</span>
      {text}
    </div>
  );
}

export function Card({ title, children, style }) {
  return (
    <div className="card" style={style}>
      {title && <div className="card-title">{title}</div>}
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
