import { useState, useEffect, useRef, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, RefreshCw, ShoppingBag, X } from 'lucide-react';
import { notificationKey, readNotifications, saveNotifications, unreadOrderNotifications, notificationOrderPath } from '../../utils/orderNotifications';

export default function AdminNotifications({ adminId, orders, loading, error, onRefresh }) {
  const key = notificationKey(adminId);
  const [seen, setSeen] = useState(() => readNotifications(localStorage, key));
  const [open, setOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const container = useRef(null);
  const trigger = useRef(null);
  const panel = useRef(null);
  const headingId = useId();
  const panelId = useId();
  const navigate = useNavigate();
  const unread = unreadOrderNotifications(orders, seen);
  useEffect(() => {
    const sync = event => { if (event.key === key || event.key === null) setSeen(readNotifications(localStorage, key)); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const outside = event => { if (!container.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const markRead = ids => {
    const next = new Set([...readNotifications(localStorage, key), ...seen, ...ids]);
    setSeen(next);
    setStorageError(!saveNotifications(localStorage, key, next));
  };
  return <div ref={container} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" onClick={() => { if (!open) onRefresh(); setOpen(value => !value); }} aria-label={`Order notifications, ${unread.length} unread`} aria-expanded={open} aria-controls={open ? panelId : undefined} className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-transparent text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
      <Bell size={20} />{unread.length > 0 && <span className="absolute -right-1 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">{unread.length > 99 ? '99+' : unread.length}</span>}
    </button>
    {open && <section ref={panel} id={panelId} tabIndex={-1} aria-labelledby={headingId} aria-busy={loading} className="fixed inset-x-3 top-[66px] z-[2000] flex max-h-[min(520px,calc(100dvh-150px))] flex-col overflow-hidden rounded-xl border border-[#e5e5e2] bg-white text-[#333] shadow-2xl outline-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[360px] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#dc4939] [&_a:focus-visible]:outline-2">
      <header className="flex items-center justify-between gap-3 border-b border-[#eee] p-4"><div><h2 id={headingId} className="m-0 font-sans! text-sm font-semibold">Order notifications</h2><p className="mb-0 mt-1 text-[10px] text-[#999]">{unread.length} unread · this admin, this browser</p></div><button type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh order notifications" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#eee] text-[#777] disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button></header>
      {error && <div role="alert" className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">{error} Showing previously loaded orders.<button className="ml-2 cursor-pointer underline" onClick={onRefresh} disabled={loading}>Retry</button></div>}
      {storageError && <p role="status" className="m-0 bg-amber-50 px-4 py-3 text-xs text-amber-900">Read status could not be saved in this browser.</p>}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {!unread.length ? <div role="status" className="px-5 py-10 text-center text-xs text-[#999]"><Bell size={26} strokeWidth={1} className="mx-auto mb-3 text-[#bbb]" />{loading ? 'Checking for orders...' : error ? 'Notifications are temporarily unavailable.' : 'You are all caught up.'}</div> : <ul className="m-0 list-none p-0">{unread.slice(0, 30).map(order => <li key={order._id} className="flex items-start gap-2 border-b border-[#f1f1ef] px-3 py-2 last:border-0 hover:bg-[#fafaf8]"><ShoppingBag size={16} className="ml-1 mt-3 shrink-0 text-[#829672]" /><button type="button" className="min-w-0 flex-1 cursor-pointer rounded-lg px-2 py-2 text-left" onClick={() => { markRead([order._id]); setOpen(false); navigate(notificationOrderPath(order._id)); }}><span className="block text-[10px] font-semibold text-[#70845f]">NEW ORDER · #{order._id.slice(-6).toUpperCase()}</span><strong className="mt-1 block truncate text-xs font-medium">{order.customerName || 'Customer'}</strong><span className="mt-1 block text-[10px] text-[#888]">{Number(order.totalAmount || 0).toLocaleString()} TK · {order.paymentStatus || 'Unpaid'}</span><time dateTime={order.createdAt} className="mt-1 block text-[9px] text-[#aaa]">{order.createdAt ? new Date(order.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</time></button><button type="button" aria-label={`Mark order ${order._id.slice(-6)} as read`} onClick={() => markRead([order._id])} className="mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#999] hover:bg-[#eee] hover:text-[#333]"><X size={14} /></button></li>)}</ul>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee] bg-[#fafaf8] px-4 py-3"><button type="button" className="inline-flex cursor-pointer items-center gap-1.5 text-[10px] text-[#637753] disabled:opacity-40" disabled={!unread.length} onClick={() => markRead(unread.map(order => order._id))}><Check size={13} />Mark all read</button><button type="button" className="cursor-pointer text-[10px] text-[#555]" onClick={() => { setOpen(false); navigate('/admin/order-list'); }}>View all orders</button>{unread.length > 30 && <span className="w-full text-[9px] text-[#aaa]">Showing the newest 30 unread orders. Mark all read applies to all {unread.length}.</span>}</footer>
    </section>}
  </div>;
}
