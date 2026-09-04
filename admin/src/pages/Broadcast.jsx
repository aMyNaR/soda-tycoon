import React, { useState } from 'react';

export default function Broadcast({ showToast }) {
  const [text, setText] = useState('');

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ marginBottom: 14 }}>📣 Broadcast — پیام به همه بازیکنان</h2>
      <div className="card">
        <textarea className="input" rows="6" placeholder="متن پیام (حداکثر ۳۰۰۰ کاراکتر)..." value={text} onChange={(e) => setText(e.target.value)} />
        <div className="muted" style={{ margin: '8px 0' }}>
          پیام به صف Bot اضافه می‌شود و Bot آن را به تمام بازیکنان غیرمسدود ارسال می‌کند.
        </div>
        <RealSend text={text} showToast={showToast} onClear={() => setText('')} />
      </div>
    </div>
  );
}

function RealSend({ text, showToast, onClear }) {
  const [sending, setSending] = useState(false);
  return (
    <button className="btn red" disabled={busy || sending || text.length < 3} onClick={async () => {
      if (!confirm(`پیام به همه بازیکنان فعال ارسال شود؟\n\n"${text.slice(0, 100)}"`)) return;
      setSending(true);
      try {
        const { adminApi } = await import('../api');
        const res = await adminApi.broadcast(text);
        showToast(`✅ ${res.queued} کاربر در صف ارسال`);
        onClear();
      } catch (e) { showToast(e.message, 'error'); }
      setSending(false);
    }}>
      {sending ? '⏳ در حال صف‌گذاری...' : '📣 ارسال Broadcast'}
    </button>
  );
}
