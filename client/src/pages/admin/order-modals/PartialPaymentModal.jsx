import React, { useState } from 'react';

const METHOD_OPTIONS = ['Cash', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Card', 'Other'];

const PartialPaymentModal = ({ order, onSave, onDelete, onClose, saving, deleting }) => {
  const [amount, setAmount]         = useState('');
  const [method, setMethod]         = useState('Cash');
  const [note, setNote]             = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // paymentId awaiting confirm

  if (!order) return null;

  const total       = Number(order.totalAmount) || 0;
  const alreadyPaid = Number(order.amountPaid)  || 0;
  const due         = order.amountDue != null ? Number(order.amountDue) : Math.max(0, total - alreadyPaid);
  const pct         = total > 0 ? Math.min(100, Math.round((alreadyPaid / total) * 100)) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) return;
    onSave({ amount: val, method, note });
    setAmount('');
    setNote('');
  };

  const handleDeleteClick = (paymentId) => {
    if (confirmDelete === paymentId) {
      onDelete(paymentId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(paymentId);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={() => { setConfirmDelete(null); onClose(); }}
    >
      <div
        className="bg-white w-full max-w-md mx-4 shadow-2xl rounded-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <div>
            <p className="text-[10px] font-bold tracking-[2px] text-amber-700 uppercase m-0">Partial Payment</p>
            <h2 className="text-base font-black text-gray-900 m-0 leading-tight">
              Order #{order._id?.slice(-6).toUpperCase()}
            </h2>
            <p className="text-[11px] text-gray-500 m-0 mt-0.5">{order.customerName} · {order.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-100 transition-colors text-gray-400 hover:text-gray-700 border-none bg-transparent cursor-pointer text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Payment Summary */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-gray-500">Order Total</span>
            <span className="font-black text-gray-900">{total.toLocaleString()} TK</span>
          </div>
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-emerald-700 font-medium">Paid So Far</span>
            <span className="font-bold text-emerald-700">{alreadyPaid.toLocaleString()} TK</span>
          </div>
          <div className="flex justify-between text-[11px] mb-3">
            <span className="text-red-700 font-bold">Remaining Due</span>
            <span className="font-black text-red-700">{Math.max(0, due).toLocaleString()} TK</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct >= 100
                  ? 'linear-gradient(90deg,#10b981,#059669)'
                  : 'linear-gradient(90deg,#f59e0b,#ea580c)',
              }}
            />
          </div>
          <div className="text-right text-[10px] text-gray-400 mt-1">{pct}% paid</div>
        </div>

        {/* Payment History */}
        {order.partialPayments?.length > 0 && (
          <div className="px-5 py-3 border-b border-gray-100 max-h-52 overflow-y-auto">
            <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-2 m-0">
              Payment History ({order.partialPayments.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {order.partialPayments.map((p, i) => {
                const pid = p._id?.toString();
                const isConfirming  = confirmDelete === pid;
                const isBeingDeleted = deleting === pid;
                return (
                  <div
                    key={pid || i}
                    className={`flex items-start gap-2.5 text-[11px] px-2.5 py-2 rounded transition-colors ${
                      isConfirming ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-gray-800">{Number(p.amount).toLocaleString()} TK</span>
                        <span className="text-[10px] text-gray-400">{new Date(p.paidAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {p.method} · {p.recordedBy?.adminName || 'Admin'}
                      </div>
                      {p.note && <div className="text-[10px] text-gray-400 italic mt-0.5">"{p.note}"</div>}
                      {isConfirming && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-red-600 font-bold">Remove this payment?</span>
                          <button
                            onClick={() => handleDeleteClick(pid)}
                            disabled={isBeingDeleted}
                            className="px-2 py-0.5 text-[9px] font-black bg-red-600 text-white rounded cursor-pointer border-none hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {isBeingDeleted ? '…' : 'YES, REMOVE'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-0.5 text-[9px] font-bold bg-gray-100 text-gray-600 rounded cursor-pointer border-none hover:bg-gray-200 transition-colors"
                          >
                            CANCEL
                          </button>
                        </div>
                      )}
                    </div>
                    {!isConfirming && (
                      <button
                        onClick={() => setConfirmDelete(pid)}
                        disabled={!!deleting || !!saving}
                        title="Remove this payment"
                        className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 border-none bg-transparent cursor-pointer transition-colors disabled:opacity-40 text-base font-bold mt-0.5"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {due > 0 ? (
          <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-3">
            <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase m-0">Record New Payment</p>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-500 mb-1">AMOUNT (TK) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`Max ${Math.max(0, due).toLocaleString()}`}
                  className="w-full px-3 py-2 border border-gray-200 text-sm font-bold outline-none focus:border-amber-500 transition-colors rounded-sm"
                  required
                />
              </div>
              <div className="w-36">
                <label className="block text-[10px] font-bold text-gray-500 mb-1">METHOD</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-200 text-xs font-bold outline-none focus:border-amber-500 transition-colors rounded-sm cursor-pointer"
                >
                  {METHOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">NOTE (optional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Customer paid half at delivery"
                className="w-full px-3 py-2 border border-gray-200 text-xs outline-none focus:border-amber-500 transition-colors rounded-sm"
              />
            </div>

            {/* Quick amount shortcuts */}
            <div className="flex gap-1.5 flex-wrap">
              {[0.25, 0.5, 0.75, 1].map(frac => {
                const quick = Math.round(due * frac);
                if (quick <= 0) return null;
                return (
                  <button
                    key={frac}
                    type="button"
                    onClick={() => setAmount(quick.toString())}
                    className="px-2 py-1 text-[10px] font-bold bg-gray-50 border border-gray-200 rounded cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors"
                  >
                    {frac === 1 ? 'Full due' : `${frac * 100}%`} ({quick.toLocaleString()})
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !amount || Number(amount) <= 0}
                className="flex-1 py-2.5 text-[11px] font-black tracking-widest uppercase bg-amber-500 hover:bg-amber-600 text-white border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-sm"
              >
                {saving ? 'SAVING…' : '✓ RECORD PAYMENT'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border-none cursor-pointer transition-colors rounded-sm"
              >
                CANCEL
              </button>
            </div>
          </form>
        ) : (
          <div className="px-5 py-6 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-sm font-bold text-emerald-700 m-0">This order is fully paid!</p>
            <p className="text-[11px] text-gray-400 mt-1 m-0">Use the × buttons above to remove an incorrect payment.</p>
            <button
              onClick={onClose}
              className="mt-4 px-5 py-2 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border-none cursor-pointer transition-colors rounded-sm"
            >
              CLOSE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartialPaymentModal;
