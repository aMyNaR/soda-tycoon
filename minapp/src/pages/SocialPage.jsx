import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, RowItem, EmptyState, Modal } from '../ui';

export default function SocialPage() {
  const [tab, setTab] = useState('FRIENDS');
  const [friends, setFriends] = useState(null);
  const [requests, setRequests] = useState(null);
  const [trades, setTrades] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [tradeModal, setTradeModal] = useState(false);
  const { toast, refreshMe } = useStore();

  const load = async () => {
    try {
      const [f, rq, t, r] = await Promise.all([api.friends(), api.friendRequests(), api.trades(), api.referrals()]);
      setFriends(f); setRequests(rq); setTrades(t); setReferrals(r);
    } catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  if (!friends) return <div className="shimmer" style={{ height: 300 }} />;

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'FRIENDS' ? 'active' : ''}`} onClick={() => setTab('FRIENDS')}>👥 دوستان ({friends.length})</button>
        <button className={`tab ${tab === 'REQ' ? 'active' : ''}`} onClick={() => setTab('REQ')}>📨 درخواست‌ها ({requests.length})</button>
        <button className={`tab ${tab === 'TRADE' ? 'active' : ''}`} onClick={() => setTab('TRADE')}>🔄 ترید</button>
        <button className={`tab ${tab === 'REF' ? 'active' : ''}`} onClick={() => setTab('REF')}>🎁 دعوت</button>
      </div>

      {tab === 'FRIENDS' && (
        <>
          <button className="btn btn-primary btn-sm" style={{ marginBottom: 10 }} onClick={() => setAddModal(true)}>➕ افزودن دوست</button>
          {friends.length === 0 && <EmptyState emoji="👥" text="دوستی ندارید — با کد دعوت اضافه کنید" />}
          {friends.map((f) => <FriendRow key={f.id} f={f} onDone={load} />)}
        </>
      )}

      {tab === 'REQ' && (
        requests.length === 0 ? <EmptyState emoji="📨" text="درخواست دوستی ندارید" /> :
        requests.map((r) => (
          <RowItem key={r.id} emoji="👤"
            title={r.user.username || r.user.firstName || `Player #${r.user.id}`}
            side={
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-green btn-sm" onClick={async () => {
                  await api.respondFriend(r.id, true); toast('✅ تأیید شد'); await load();
                }}>✓</button>
                <button className="btn btn-dark btn-sm" onClick={async () => {
                  await api.respondFriend(r.id, false); await load();
                }}>✕</button>
              </div>
            } />
        ))
      )}

      {tab === 'TRADE' && (
        <>
          <button className="btn btn-primary btn-sm" style={{ marginBottom: 10 }} onClick={() => setTradeModal(true)}>➕ معامله جدید</button>
          {trades.length === 0 && <EmptyState emoji="🔄" text="معامله‌ای نیست" />}
          {trades.map((t) => <TradeRow key={t.id} t={t} me={useStore.getState().me.user.id} onDone={load} />)}
        </>
      )}

      {tab === 'REF' && (
        <Card title="🎁 دعوت دوستان">
          <div style={{ textAlign: 'center', padding: 10 }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--gold)' }}>#{referrals.code}</div>
            <div className="muted">کد دعوت شما</div>
            <div style={{ margin: '12px 0' }}>
              <div style={{ fontWeight: 800 }}>👥 {referrals.list.length} نفر دعوت شده</div>
              <div className="muted">🪙 مجموع درآمد دعوت: {fmt(referrals.totalEarned)}</div>
            </div>
            {referrals.list.map((r) => (
              <RowItem key={r.id} emoji="👤" title={r.username || r.firstName || `Player #${r.id}`}
                sub={`⭐ Level ${r.level}`} />
            ))}
          </div>
        </Card>
      )}

      {addModal && <AddFriendModal onClose={() => setAddModal(false)} onDone={async () => { setAddModal(false); await load(); }} />}
      {tradeModal && <TradeModal onClose={() => setTradeModal(false)} onDone={async () => { setTradeModal(false); await load(); }} />}
    </div>
  );
}

function FriendRow({ f, onDone }) {
  const [inv, setInv] = useState(null);
  const { toast } = useStore();
  return (
    <RowItem
      emoji="🧑"
      title={f.username || f.firstName || `Player #${f.id}`}
      sub={`⭐ L${f.level} | 🏭 ${f.totalProduced} تولید`}
      side={
        <button className="btn btn-gold btn-sm" onClick={async () => {
          // هدیه سریع: ۱۰ شکر
          try {
            await api.sendGift(f.id, 'INGREDIENT', 'sugar', 10, 'هدیه از طرف من! 🎁');
            toast('🎁 هدیه ارسال شد!');
          } catch (e) { toast(e.message, 'error'); }
        }}>🎁 هدیه</button>
      }
    />
  );
}

function TradeRow({ t, me, onDone }) {
  const offer = t.items.find((i) => i.side === 'OFFER');
  const request = t.items.find((i) => i.side === 'REQUEST');
  const { toast } = useStore();
  const isMine = t.sellerId === me;
  return (
    <div className="row-item">
      <div className="ri-emoji">🔄</div>
      <div className="ri-body">
        <div className="ri-title">معامله #{t.id} {isMine && <span className="badge blue">من</span>}</div>
        <div className="ri-sub">می‌دهد: {offer.emoji || '🪙'} {offer.kind === 'COIN' ? fmt(offer.quantity) : `${offer.quantity}× ${offer.key}`}</div>
        <div className="ri-sub">می‌خواهد: {request.kind === 'COIN' ? `🪙 ${fmt(request.quantity)}` : `${request.quantity}× ${request.key}`}</div>
        <div className="ri-sub">{t.status === 'OPEN' ? '🟢 باز' : t.status === 'ACCEPTED' ? '✅ تکمیل' : '❌ بسته'}</div>
      </div>
      {!isMine && t.status === 'OPEN' && (
        <div className="ri-side">
          <button className="btn btn-green btn-sm" onClick={async () => {
            try {
              await api.respondTrade(t.id, true);
              toast('✅ معامله انجام شد!');
              await onDone();
            } catch (e) { toast(e.message, 'error'); }
          }}>پذیرش</button>
        </div>
      )}
    </div>
  );
}

function AddFriendModal({ onClose, onDone }) {
  const [id, setId] = useState('');
  const { toast } = useStore();
  return (
    <Modal title="➕ افزودن دوست" onClose={onClose}>
      <div className="muted" style={{ marginBottom: 10 }}>کد دوست (شماره کاربر) را وارد کنید:</div>
      <input className="input" type="number" value={id} onChange={(e) => setId(e.target.value)} placeholder="مثلاً 3" />
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={async () => {
        try {
          await api.addFriend(parseInt(id));
          toast('📨 درخواست ارسال شد!');
          onDone();
        } catch (e) { toast(e.message, 'error'); }
      }}>ارسال درخواست</button>
    </Modal>
  );
}

function TradeModal({ onClose, onDone }) {
  const [inv, setInv] = useState(null);
  const [offer, setOffer] = useState(null);
  const [wantKind, setWantKind] = useState('COIN');
  const [wantKey, setWantKey] = useState('');
  const [wantQty, setWantQty] = useState(100);
  const { toast } = useStore();

  useEffect(() => { api.inventory().then(setInv).catch(() => {}); }, []);

  return (
    <Modal title="🔄 معامله جدید" onClose={onClose}>
      <div className="muted" style={{ marginBottom: 8 }}>۱. چیزی را که می‌دهید انتخاب کنید (escrow می‌شود):</div>
      {inv?.items.filter((i) => i.quantity > 0 && (i.kind === 'INGREDIENT' || i.kind === 'SODA')).map((s) => (
        <RowItem key={s.key} emoji={s.emoji} title={s.name} sub={`📦 ${fmt(s.quantity)}`}
          onClick={() => setOffer(s)} side={offer?.key === s.key ? '✓' : ''} />
      ))}
      <div className="muted" style={{ margin: '12px 0 8px' }}>۲. چیزی را که می‌خواهید:</div>
      <div className="tabs">
        <button className={`tab ${wantKind === 'COIN' ? 'active' : ''}`} onClick={() => setWantKind('COIN')}>🪙 کوین</button>
        <button className={`tab ${wantKind === 'INGREDIENT' ? 'active' : ''}`} onClick={() => setWantKind('INGREDIENT')}>🍬 ماده</button>
      </div>
      {wantKind === 'COIN' ? (
        <input className="input" type="number" value={wantQty} onChange={(e) => setWantQty(parseInt(e.target.value) || 0)} style={{ marginTop: 8 }} />
      ) : (
        <input className="input" value={wantKey} onChange={(e) => setWantKey(e.target.value)} placeholder="کلید ماده (مثلاً sugar)" style={{ marginTop: 8 }} />
      )}
      <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={!offer}
        onClick={async () => {
          try {
            await api.createTrade(
              { kind: offer.kind, key: offer.key, quantity: Math.min(10, offer.quantity) },
              { kind: wantKind, key: wantKey, quantity: wantQty }
            );
            toast('✅ پیشنهاد ثبت شد!');
            onDone();
          } catch (e) { toast(e.message, 'error'); }
        }}>ثبت معامله</button>
      <div className="muted" style={{ marginTop: 8 }}>⚠️ آیتم پیشنهادی تا پذیرش، قفل (escrow) می‌شود.</div>
    </Modal>
  );
}
