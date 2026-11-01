import React, { useState, useEffect, useMemo, useCallback } from 'react';
import adminAxios from '../../utils/adminAxios';
import { PageHeading, Stats, ErrorNotice, Modal } from '../../components/admin/AdminUi';
import { field, button, primary, money } from '../../utils/adminPresentation';
import { downloadCsv } from '../../utils/adminExport';
import { expenseDay } from '../../utils/expenseRecords';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import {
  BarChart, Bar, PieChart, Pie, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const COLORS = ['#111', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111', padding: '8px 12px', borderRadius: 4 }}>
      <p style={{ color: '#aaa', fontSize: 10, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: '#fff', fontSize: 11, margin: 0 }}>
          {p.name}: ৳{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const SettlementDashboard = () => {
  const [query] = useSearchParams();
  const toast = useToast();
  const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
  const isSuperadmin = adminData?.role === 'superadmin';

  // ── State ──
  const [dashboard, setDashboard] = useState(null);
  const [balances, setBalances] = useState([]);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [review, setReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultForm, setVaultForm] = useState({ amount: '', note: '' });
  const [vaultBusy, setVaultBusy] = useState(false);

  // ── Settlement request form ──
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ amount: '', paymentMethod: 'Cash', transactionId: '', note: '' });
  const [requesting, setRequesting] = useState(false);

  // ── Filters ──
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');

  // ── Tab ──
  const [activeTab, setActiveTab] = useState(isSuperadmin ? 'dashboard' : 'balance');
  useEffect(() => {
    const tab = query.get('tab');
    if ((isSuperadmin ? ['dashboard', 'pending', 'history', 'reports'] : ['balance', 'history']).includes(tab)) setActiveTab(tab);
  }, [query, isSuperadmin]);

  // ── Confirm/Reject state ──
  const [confirmingId, setConfirmingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // ── Direct Settle state (superadmin) ──
  const [directSettleTarget, setDirectSettleTarget] = useState(null); // { adminId, adminName, outstandingBalance }
  const [directSettleForm, setDirectSettleForm] = useState({ amount: '', paymentMethod: 'Cash', transactionId: '', note: '' });
  const [directSettling, setDirectSettling] = useState(false);

  // ── Fetch data ──
  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const promises = [
        adminAxios.get(`${API_URL}/api/settlements/balances`),
        adminAxios.get(`${API_URL}/api/settlements/history`),
      ];
      if (isSuperadmin) {
        promises.push(adminAxios.get(`${API_URL}/api/settlements/dashboard`));
        promises.push(adminAxios.get(`${API_URL}/api/settlements/pending`));
        promises.push(adminAxios.get(`${API_URL}/api/settlements/reports`));
      }
      const results = await Promise.all(promises);
      setBalances(results[0].data);
      setHistory(results[1].data);
      if (isSuperadmin) {
        setDashboard(results[2].data);
        setPending(results[3].data);
        setReports(results[4].data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load settlement data. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── My balance (for normal admin) ──
  const myBalance = useMemo(() => {
    return balances.find(b => b._id === (adminData?.id || adminData?._id)) || {
      totalCollected: 0, totalSettled: 0, outstandingBalance: 0, transactionCount: 0
    };
  }, [balances, adminData?.id, adminData?._id]);

  // ── Submit settlement request ──
  const submitSettlementRequest = async () => {
    if (!Number.isFinite(Number(requestForm.amount)) || Number(requestForm.amount) <= 0 || Number(requestForm.amount) > available) {
      return toast.warning('Enter a valid amount.');
    }
    setRequesting(true);
    try {
      await adminAxios.post(`${API_URL}/api/settlements/request`, {
        amount: Number(requestForm.amount),
        paymentMethod: requestForm.paymentMethod,
        transactionId: requestForm.transactionId,
        note: requestForm.note
      });
      toast.success('Settlement request submitted!');
      setShowRequestForm(false);
      setRequestForm({ amount: '', paymentMethod: 'Cash', transactionId: '', note: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setRequesting(false);
    }
  };

  // ── Confirm settlement ──
  const confirmSettlement = async (id) => {
    try {
      setConfirmingId(id);
      await adminAxios.put(`${API_URL}/api/settlements/${id}/confirm`);
      toast.success('Settlement confirmed!');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm.');
    } finally {
      setConfirmingId(null);
    }
  };

  // ── Direct settle (superadmin → admin, no request needed) ──
  const submitDirectSettle = async () => {
    if (!Number.isFinite(Number(directSettleForm.amount)) || Number(directSettleForm.amount) <= 0 || Number(directSettleForm.amount) > directSettleTarget.outstandingBalance) {
      return toast.warning('Enter a valid amount.');
    }
    setDirectSettling(true);
    try {
      await adminAxios.post(`${API_URL}/api/settlements/direct-settle`, {
        adminId: directSettleTarget.adminId,
        amount: Number(directSettleForm.amount),
        paymentMethod: directSettleForm.paymentMethod,
        transactionId: directSettleForm.transactionId,
        note: directSettleForm.note
      });
      toast.success(`৳${Number(directSettleForm.amount).toLocaleString()} settled for ${directSettleTarget.adminName}!`);
      setDirectSettleTarget(null);
      setDirectSettleForm({ amount: '', paymentMethod: 'Cash', transactionId: '', note: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to settle.');
    } finally {
      setDirectSettling(false);
    }
  };

  // ── Reject settlement ──
  const rejectSettlement = async (id) => {
    try {
      setRejectingId(id);
      await adminAxios.put(`${API_URL}/api/settlements/${id}/reject`, { reason: rejectReason });
      toast.success('Settlement rejected.');
      setRejectReason('');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject.');
    } finally {
      setRejectingId(null);
    }
  };

  // ── Filtered history ──
  const filteredHistory = useMemo(() => history.filter(entry =>
    (historyFilter === 'all' || entry.status === historyFilter) &&
    (!adminFilter || String(entry.adminId?._id || entry.adminId) === adminFilter) &&
    (!historySearch || [entry.adminName, entry._id, entry.transactionId, entry.note, entry.paymentMethod].join(' ').toLowerCase().includes(historySearch.toLowerCase())) &&
    (!historyDateFrom || expenseDay(entry.createdAt) >= historyDateFrom) &&
    (!historyDateTo || expenseDay(entry.createdAt) <= historyDateTo)
  ), [history, historyFilter, adminFilter, historySearch, historyDateFrom, historyDateTo]);
  const pendingAmount = Number(myBalance.pendingAmount ?? history.filter(s => s.status === 'pending').reduce((total, s) => total + s.amount, 0));
  const available = Math.max(0, myBalance.outstandingBalance - pendingAmount);
  const exportHistory = () => downloadCsv('settlement-history.csv', ['ID', 'Admin', 'Amount (TK)', 'Method', 'Reference', 'Submitted (Bangladesh)', 'Status', 'Reviewed by', 'Notes'], filteredHistory.map(s => [s._id, s.adminName, s.amount, s.paymentMethod, s.transactionId, new Date(s.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }), s.status, s.confirmedBy?.adminName, s.note]));
  const reviewAction = (kind, form, target) => {
    const amount = Number(form.amount);
    const max = kind === 'request' ? available : kind === 'vault' ? dashboard?.superadminHolding || 0 : target.outstandingBalance;
    if (!Number.isFinite(amount) || amount <= 0 || amount > max) return toast.warning('Enter an amount within the available balance.');
    setReview({ kind, form: { ...form, amount }, target });
  };
  const performReviewed = async () => {
    if (reviewing) return;
    setReviewing(true);
    try {
      if (review.kind === 'confirm') await confirmSettlement(review.target._id);
      else if (review.kind === 'request') await submitSettlementRequest();
      else if (review.kind === 'direct') await submitDirectSettle();
      else {
        setVaultBusy(true);
        await adminAxios.post('/api/settlements/vault-transfer', review.form);
        toast.success('Transfer to vault recorded.'); setVaultOpen(false); setVaultForm({ amount: '', note: '' }); await fetchAll();
      }
      setReview(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Could not record transfer.'); setReview(null); }
    finally { setReviewing(false); setVaultBusy(false); }
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="text-[32px] mb-4">💰</div>
        <p className="text-[11px] text-[#aaa] tracking-wider">Loading settlement data...</p>
      </div>
    );
  }

  if (error) return <section><PageHeading eyebrow="FINANCE / SETTLEMENTS" title="Settlements" description="Balances could not be refreshed." /><ErrorNotice message={error} onRetry={fetchAll} /></section>;

  const getStatusBadge = (status) => {
    const map = {
      pending: 'bg-amber-100 text-amber-800',
      confirmed: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  // ── Tabs ──
  const tabs = isSuperadmin
    ? [
        { key: 'dashboard', label: 'DASHBOARD', icon: '📊' },
        { key: 'pending', label: `PENDING (${pending.length})`, icon: '⏳' },
        { key: 'history', label: 'HISTORY', icon: '📋' },
        { key: 'reports', label: 'REPORTS', icon: '📈' },
      ]
    : [
        { key: 'balance', label: 'MY BALANCE', icon: '💰' },
        { key: 'history', label: 'MY HISTORY', icon: '📋' },
      ];

  return (
    <div className="mx-auto max-w-[1450px] pb-12 [&_table]:min-w-[760px] [&_th]:text-[#888] [&_input]:rounded-lg [&_select]:rounded-lg [&_button]:rounded-lg [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#dc4939]">
      {/* ── Header ── */}
      <PageHeading eyebrow="FINANCE / SETTLEMENTS" title={isSuperadmin ? 'Keep every handover clear.' : 'Your collections. Your balance.'} description={isSuperadmin ? 'Review incoming settlements and track funds held by staff, yourself, and the vault.' : 'Track what you collected, what was confirmed, and what is awaiting review.'}><button className={button} onClick={fetchAll}>Refresh</button>{isSuperadmin ? <button className={primary} disabled={!dashboard?.superadminHolding} onClick={() => setVaultOpen(true)}>Transfer to vault</button> : <button className={primary} disabled={available <= 0} onClick={() => setShowRequestForm(true)}>Request settlement</button>}</PageHeading>
      {isSuperadmin ? <div className="mb-6 rounded-xl border border-[#e7e7e5] bg-[#fafaf8] p-5 text-xs leading-6 text-[#777]">Staff holding, then confirmed receipt into your holding, then explicit vault transfer. These are separate steps; pending requests do not move money.<strong className="mt-2 block text-[#333]">Recorded transfers to vault: {money(dashboard?.vaultBalance)}</strong></div> : <><Stats items={[{ label: 'Outstanding balance', value: money(myBalance.outstandingBalance), note: 'Collections + adjustments - confirmed settlements' }, { label: 'Awaiting review', value: money(pendingAmount), note: 'Included in outstanding until confirmed' }, { label: 'Available to request', value: money(available), note: 'Outstanding less pending requests' }]} /><p className="mb-6 text-xs leading-6 text-[#888]">Submitting a request does not reduce your outstanding balance until a superadmin confirms receipt. Rejected requests release the amount for a new request.</p></>}

      {/* ── Tab Bar ── */}
      <div className="flex gap-0 mb-6 border-b border-[#eee] overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-[10px] font-bold tracking-wider border-b-2 cursor-pointer transition-colors bg-transparent whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-black text-black'
                : 'border-transparent text-[#999] hover:text-black'
            }`}>
            <span className="mr-1.5">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SUPERADMIN: Dashboard Tab                                */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && isSuperadmin && dashboard && (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {[
              { label: 'MY HOLDING BALANCE', value: `৳${Number(dashboard.superadminHolding || 0).toLocaleString()}`, sub: 'Collected directly or received from admins, less vault transfers', color: 'border-l-teal-500' },
              { label: 'COLLECTED TODAY', value: `৳${dashboard.summary.totalCollectedToday.toLocaleString()}`, sub: `${dashboard.summary.collectionsToday} orders`, color: 'border-l-emerald-500' },
              { label: 'SETTLED TODAY', value: `৳${dashboard.summary.totalSettledToday.toLocaleString()}`, sub: `${dashboard.summary.settlementsToday} settlements`, color: 'border-l-blue-500' },
              { label: 'PENDING SETTLEMENTS', value: dashboard.summary.pendingSettlements, sub: 'awaiting confirmation', color: 'border-l-amber-500' },
              {
                label: 'TOTAL OUTSTANDING',
                value: `৳${dashboard.admins.reduce((sum, a) => sum + Math.max(0, a.outstandingBalance), 0).toLocaleString()}`,
                sub: 'across all admins',
                color: 'border-l-red-500'
              },
              {
                label: 'TOTAL COLLECTED',
                value: `৳${dashboard.admins.reduce((sum, a) => sum + a.totalAmountCollected, 0).toLocaleString()}`,
                sub: 'all time',
                color: 'border-l-violet-500'
              },
            ].map((card, i) => (
              <div key={i} className={`rounded-xl bg-white p-5 border border-[#e7e7e5] border-l-4 ${card.color}`}>
                <p className="text-[9px] font-bold tracking-wider text-[#999] mb-1">{card.label}</p>
                <p className="text-xl font-bold m-0">{card.value}</p>
                <p className="text-[10px] text-[#aaa] m-0 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Admin Balance Table */}
          <div className="mb-6">
            <h4 className="text-[11px] tracking-[2px] font-bold text-[#888] mb-3">ADMIN BALANCES</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-black">
                    {['ADMIN', 'ROLE', 'ORDERS', 'COLLECTED', 'SETTLED', 'OUTSTANDING', 'PENDING', 'LAST SETTLEMENT', 'STATUS', 'ACTION'].map(h => (
                      <th key={h} className="py-2.5 px-3 text-left text-[10px] font-bold tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.admins.map(admin => (
                    <tr key={admin.adminId} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                      <td className="py-3 px-3 font-bold">{admin.adminName}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm ${admin.role === 'superadmin' ? 'bg-violet-100 text-violet-800' : 'bg-gray-100 text-gray-700'}`}>
                          {admin.role === 'superadmin' ? 'SUPER ADMIN' : 'ADMIN'}
                        </span>
                      </td>
                      <td className="py-3 px-3">{admin.totalOrdersCollected}</td>
                      <td className="py-3 px-3 font-bold">৳{admin.totalAmountCollected.toLocaleString()}</td>
                      <td className="py-3 px-3 text-emerald-700">৳{admin.amountSettled.toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <span className={`font-bold ${admin.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          ৳{admin.outstandingBalance.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {admin.pendingSettlements > 0 && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-sm">
                            {admin.pendingSettlements} (৳{admin.pendingAmount.toLocaleString()})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[#888]">
                        {admin.lastSettlementDate ? new Date(admin.lastSettlementDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm ${
                          admin.status === 'Settled' ? 'bg-emerald-100 text-emerald-800' :
                          admin.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {admin.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {admin.role !== 'superadmin' && admin.outstandingBalance > 0 && (
                          <button
                            onClick={() => {
                              setDirectSettleTarget({ adminId: admin.adminId, adminName: admin.adminName, outstandingBalance: admin.outstandingBalance });
                              setDirectSettleForm({ amount: String(admin.outstandingBalance), paymentMethod: 'Cash', transactionId: '', note: '' });
                            }}
                            className="px-3 py-1.5 bg-black text-white border-none cursor-pointer text-[9px] font-bold tracking-wider hover:bg-gray-700 transition-colors whitespace-nowrap">
                            💸 SETTLE
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SUPERADMIN: Pending Tab                                  */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'pending' && isSuperadmin && (
        <div>
          {pending.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[32px] mb-2">✅</p>
              <p className="text-[11px] text-[#aaa] tracking-wider">No pending settlement requests</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map(s => (
                <div key={s._id} className="rounded-xl border border-[#e7e7e5] bg-white p-5 hover:border-[#ccc] transition-colors">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[#888]">#{s._id.slice(-6).toUpperCase()}</span>
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-sm">PENDING</span>
                      </div>
                      <h4 className="text-lg font-bold m-0">{s.adminName}</h4>
                      <p className="text-[11px] text-[#888] m-0 mt-0.5">
                        Submitted {new Date(s.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })} - {Math.max(0, Math.floor((Date.now() - new Date(s.createdAt)) / 86400000))} days ago
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold m-0">৳{s.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-[#888] m-0 mt-0.5">via {s.paymentMethod}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-4 mb-4 text-[11px]">
                    {s.transactionId && (
                      <div>
                        <span className="text-[#999]">TXN ID: </span>
                        <span className="font-mono font-bold">{s.transactionId}</span>
                      </div>
                    )}
                    {s.note && (
                      <div>
                        <span className="text-[#999]">Note: </span>
                        <span>{s.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setReview({ kind: 'confirm', target: s, form: { amount: s.amount, paymentMethod: s.paymentMethod, transactionId: s.transactionId } })}
                      disabled={confirmingId === s._id}
                      className="px-4 py-2 bg-emerald-600 text-white border-none cursor-pointer text-[10px] font-bold tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-60">
                      {confirmingId === s._id ? 'CONFIRMING...' : '✅ CONFIRM RECEIVED'}
                    </button>
                    <button onClick={() => setRejectingId(rejectingId === s._id ? null : s._id)}
                      className="px-4 py-2 bg-white text-red-600 border border-red-200 cursor-pointer text-[10px] font-bold tracking-wider hover:bg-red-50 transition-colors">
                      ❌ REJECT
                    </button>
                  </div>

                  {/* Reject reason input */}
                  {rejectingId === s._id && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-[#f0f0f0]">
                      <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (optional)"
                        className="flex-1 p-2 border border-[#ddd] text-[12px] outline-none" />
                      <button onClick={() => rejectSettlement(s._id)}
                        className="px-4 py-2 bg-red-600 text-white border-none cursor-pointer text-[10px] font-bold hover:bg-red-700 transition-colors">
                        CONFIRM REJECT
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* NORMAL ADMIN: Balance Tab                                */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'balance' && !isSuperadmin && (
        <div>
          {/* Balance Card */}
          <div className="max-w-md mx-auto mb-8">
            <div className="border border-[#eee] p-6 border-l-4 border-l-black">
              <p className="text-[10px] font-bold tracking-wider text-[#999] mb-1">YOUR OUTSTANDING BALANCE</p>
              <p className={`text-3xl font-bold m-0 ${myBalance.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ৳{(myBalance.outstandingBalance || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-[#aaa] m-0 mt-1">
                {myBalance.transactionCount || 0} orders collected · ৳{(myBalance.totalCollected || 0).toLocaleString()} total
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="border border-[#eee] p-4 text-center">
                <p className="text-[9px] font-bold tracking-wider text-[#999]">TOTAL COLLECTED</p>
                <p className="text-lg font-bold m-0 mt-1">৳{(myBalance.totalCollected || 0).toLocaleString()}</p>
              </div>
              <div className="border border-[#eee] p-4 text-center">
                <p className="text-[9px] font-bold tracking-wider text-[#999]">TOTAL SETTLED</p>
                <p className="text-lg font-bold m-0 mt-1 text-emerald-600">৳{(myBalance.totalSettled || 0).toLocaleString()}</p>
              </div>
            </div>

            {myBalance.outstandingBalance > 0 && (
              <button disabled={available <= 0} onClick={() => setShowRequestForm(true)}
                className="w-full mt-4 px-4 py-3 bg-black text-white border-none cursor-pointer text-[11px] font-bold tracking-wider hover:bg-gray-800 transition-colors">
                💸 REQUEST SETTLEMENT
              </button>
            )}
          </div>

          {/* Pending settlements */}
          {history.filter(s => s.status === 'pending').length > 0 && (
            <div className="mb-6">
              <h4 className="text-[11px] tracking-[2px] font-bold text-[#888] mb-3">YOUR PENDING REQUESTS</h4>
              {history.filter(s => s.status === 'pending').map(s => (
                <div key={s._id} className="border border-amber-200 bg-amber-50 p-4 mb-2 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono text-[#888]">#{s._id.slice(-6).toUpperCase()}</span>
                    <p className="text-sm font-bold m-0 mt-0.5">৳{s.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-[#888] m-0">{s.paymentMethod} · {new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="bg-amber-200 text-amber-800 text-[9px] font-bold px-3 py-1 rounded-sm">
                    ⏳ PENDING
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* BOTH: History Tab                                        */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4"><input aria-label="Search settlement history" className={field + ' max-w-64'} placeholder="Name, reference, or note..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} />{isSuperadmin && <select aria-label="Filter by admin" className={field + ' max-w-48'} value={adminFilter} onChange={e => setAdminFilter(e.target.value)}><option value="">All admins</option>{dashboard?.admins.map(a => <option key={a.adminId} value={a.adminId}>{a.adminName}</option>)}</select>}<button className={button} disabled={!filteredHistory.length} onClick={exportHistory}>Export filtered history</button>
            <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}
              className="px-2 py-2 border border-[#ddd] text-[11px] outline-none cursor-pointer font-bold">
              <option value="all">ALL STATUS</option>
              <option value="pending">PENDING</option>
              <option value="confirmed">CONFIRMED</option>
              <option value="rejected">REJECTED</option>
            </select>
            <span className="text-[10px] font-bold text-[#888] tracking-wider">FROM:</span>
            <input type="date" max={historyDateTo || undefined} value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)}
              className="px-2 py-1.5 border border-[#ddd] text-[11px] outline-none" />
            <span className="text-[#aaa] text-xs">to</span>
            <input type="date" min={historyDateFrom || undefined} value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)}
              className="px-2 py-1.5 border border-[#ddd] text-[11px] outline-none" />
            {(historyDateFrom || historyDateTo || historyFilter !== 'all' || historySearch || adminFilter) && (
              <button onClick={() => { setHistoryFilter('all'); setHistoryDateFrom(''); setHistoryDateTo(''); setHistorySearch(''); setAdminFilter(''); }}
                className="text-[10px] text-[#888] underline cursor-pointer bg-transparent border-none">CLEAR</button>
            )}
            <span className="text-[10px] text-[#888] ml-auto">{filteredHistory.length} records - latest 500 loaded</span>
          </div>

          {/* History Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-black">
                  {['ID', 'ADMIN', 'AMOUNT', 'METHOD', 'TXN ID', 'SUBMITTED', 'CONFIRMED', 'CONFIRMED BY', 'STATUS', 'NOTES'].map(h => (
                    <th key={h} className="py-2.5 px-2 text-left text-[10px] font-bold tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length > 0 ? filteredHistory.map(s => (
                  <tr key={s._id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                    <td className="py-2.5 px-2 font-mono text-[10px] text-[#888]">#{s._id.slice(-6).toUpperCase()}</td>
                    <td className="py-2.5 px-2 font-bold">{s.adminName}</td>
                    <td className="py-2.5 px-2 font-bold">৳{s.amount.toLocaleString()}</td>
                    <td className="py-2.5 px-2">{s.paymentMethod}</td>
                    <td className="py-2.5 px-2 font-mono text-[10px]">{s.transactionId || '—'}</td>
                    <td className="py-2.5 px-2 whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="py-2.5 px-2 whitespace-nowrap">{s.confirmedAt ? new Date(s.confirmedAt).toLocaleDateString() : '—'}</td>
                    <td className="py-2.5 px-2">{s.confirmedBy?.adminName || '—'}</td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm ${getStatusBadge(s.status)}`}>
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 min-w-[160px] max-w-[300px] whitespace-pre-wrap break-words text-[11px] text-[#888]">{s.note || '—'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="10" className="text-center py-12 text-gray-300">No settlement records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SUPERADMIN: Reports Tab                                  */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && isSuperadmin && reports && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Collection by Admin */}
            <div className="border border-[#eee] p-5">
              <h4 className="text-[11px] tracking-[2px] font-bold text-[#888] mb-4">COLLECTION BY ADMIN</h4>
              {reports.collectionByAdmin.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reports.collectionByAdmin.map(r => ({ name: r.adminName, amount: r.totalAmount }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" name="Collected" fill="#111" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[11px] text-[#ccc] text-center py-8">No collection data yet</p>
              )}
            </div>

            {/* Collection by Payment Method */}
            <div className="border border-[#eee] p-5">
              <h4 className="text-[11px] tracking-[2px] font-bold text-[#888] mb-4">COLLECTION BY METHOD</h4>
              {reports.collectionByMethod.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={reports.collectionByMethod.map(r => ({ name: r._id || 'Unknown', value: r.totalAmount }))}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {reports.collectionByMethod.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => `৳${Number(v).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[11px] text-[#ccc] text-center py-8">No collection data yet</p>
              )}
            </div>
          </div>

          {/* Daily Trend */}
          <div className="border border-[#eee] p-5 mb-8">
            <h4 className="text-[11px] tracking-[2px] font-bold text-[#888] mb-4">DAILY COLLECTION TREND (30 DAYS)</h4>
            {reports.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={reports.dailyTrend.map(d => ({ date: d._id.slice(5), amount: d.totalAmount, orders: d.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[11px] text-[#ccc] text-center py-8">No trend data yet</p>
            )}
          </div>

          {/* Admin-wise Breakdown Table */}
          <div className="border border-[#eee] p-5">
            <h4 className="text-[11px] tracking-[2px] font-bold text-[#888] mb-4">COLLECTION BREAKDOWN BY ADMIN</h4>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-black">
                  {['ADMIN', 'ORDERS COLLECTED', 'TOTAL AMOUNT'].map(h => (
                    <th key={h} className="py-2.5 px-3 text-left text-[10px] font-bold tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.collectionByAdmin.map((r, i) => (
                  <tr key={i} className="border-b border-[#f0f0f0]">
                    <td className="py-2.5 px-3 font-bold">{r.adminName}</td>
                    <td className="py-2.5 px-3">{r.count}</td>
                    <td className="py-2.5 px-3 font-bold">৳{r.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* Settlement Request Modal                                 */}
      {/* ════════════════════════════════════════════════════════ */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-[3000]" onClick={() => setShowRequestForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-[420px] max-h-[90dvh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[13px] tracking-[2px] m-0 font-bold">REQUEST SETTLEMENT</h3>
              <button onClick={() => setShowRequestForm(false)} className="bg-transparent border-none text-lg cursor-pointer text-gray-400">×</button>
            </div>

            <div className="mb-3 p-3 bg-[#f9f9f9] border border-[#eee]">
              <p className="text-[10px] font-bold text-[#888] tracking-wider">YOUR OUTSTANDING BALANCE</p>
              <p className="mt-2 text-xs text-[#888]">Available for a new request: {money(available)} (pending: {money(pendingAmount)})</p><p className="text-xl font-bold m-0 mt-1 text-red-600">৳{(myBalance.outstandingBalance || 0).toLocaleString()}</p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">AMOUNT *</label>
                <input type="number" min="0.01" step="0.01" max={available} value={requestForm.amount}
                  onChange={e => setRequestForm({ ...requestForm, amount: e.target.value })}
                  placeholder="Enter amount to transfer"
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">PAYMENT METHOD *</label>
                <select value={requestForm.paymentMethod}
                  onChange={e => setRequestForm({ ...requestForm, paymentMethod: e.target.value })}
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none cursor-pointer box-border">
                  <option value="Cash">Cash (Hand to Hand)</option>
                  <option value="Bkash">Bkash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">TRANSACTION ID (OPTIONAL)</label>
                <input type="text" value={requestForm.transactionId}
                  onChange={e => setRequestForm({ ...requestForm, transactionId: e.target.value })}
                  placeholder="Enter transaction reference"
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">NOTE (OPTIONAL)</label>
                <input type="text" value={requestForm.note}
                  onChange={e => setRequestForm({ ...requestForm, note: e.target.value })}
                  placeholder="Any additional notes"
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border" />
              </div>
            </div>

            <button onClick={() => reviewAction('request', requestForm)} disabled={requesting}
              className="w-full bg-black text-white border-none p-3 cursor-pointer font-bold tracking-wider mt-5 hover:bg-gray-800 transition-colors disabled:opacity-60">
              {requesting ? 'SUBMITTING...' : 'SUBMIT SETTLEMENT REQUEST'}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* Direct Settle Modal (Superadmin only)                   */}
      {/* ════════════════════════════════════════════════════════ */}
      {directSettleTarget && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-[3000]" onClick={() => setDirectSettleTarget(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-[440px] max-h-[90dvh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-[9px] font-bold tracking-[2px] text-[#888] mb-0.5">DIRECT SETTLE BALANCE</p>
                <h3 className="text-[15px] font-bold m-0">{directSettleTarget.adminName}</h3>
              </div>
              <button onClick={() => setDirectSettleTarget(null)} className="bg-transparent border-none text-xl cursor-pointer text-gray-400 leading-none">×</button>
            </div>

            {/* Outstanding balance info */}
            <div className="mb-4 p-3 bg-red-50 border border-red-100 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-bold text-[#888] tracking-wider">OUTSTANDING BALANCE</p>
                <p className="text-xl font-bold m-0 text-red-600">৳{directSettleTarget.outstandingBalance.toLocaleString()}</p>
              </div>
              <button
                onClick={() => setDirectSettleForm(f => ({ ...f, amount: String(directSettleTarget.outstandingBalance) }))}
                className="text-[9px] font-bold text-black underline bg-transparent border-none cursor-pointer tracking-wider">
                FILL FULL
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">AMOUNT TO SETTLE *</label>
                <input type="number" min="0.01" step="0.01" max={directSettleTarget.outstandingBalance} value={directSettleForm.amount}
                  onChange={e => setDirectSettleForm({ ...directSettleForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">PAYMENT METHOD *</label>
                <select value={directSettleForm.paymentMethod}
                  onChange={e => setDirectSettleForm({ ...directSettleForm, paymentMethod: e.target.value })}
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none cursor-pointer box-border">
                  <option value="Cash">Cash (Hand to Hand)</option>
                  <option value="Bkash">Bkash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">TRANSACTION ID (OPTIONAL)</label>
                <input type="text" value={directSettleForm.transactionId}
                  onChange={e => setDirectSettleForm({ ...directSettleForm, transactionId: e.target.value })}
                  placeholder="Enter transaction reference"
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">NOTE (OPTIONAL)</label>
                <input type="text" value={directSettleForm.note}
                  onChange={e => setDirectSettleForm({ ...directSettleForm, note: e.target.value })}
                  placeholder="Any additional notes"
                  className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border" />
              </div>
            </div>

            <div className="mt-5 p-3 bg-amber-50 border border-amber-100">
              <p className="text-[10px] text-amber-800 m-0">
                ⚡ This settlement will be <strong>immediately confirmed</strong> without an admin request. Use this when you have already received the cash from the admin.
              </p>
            </div>

            <button onClick={() => reviewAction('direct', directSettleForm, directSettleTarget)} disabled={directSettling}
              className="w-full bg-black text-white border-none p-3 cursor-pointer font-bold tracking-wider mt-4 hover:bg-gray-800 transition-colors disabled:opacity-60">
              {directSettling ? 'SETTLING...' : '✅ CONFIRM & SETTLE NOW'}
            </button>
          </div>
        </div>
      )}
      <Modal open={vaultOpen} title="Transfer from my holding to vault" busy={vaultBusy} onClose={() => setVaultOpen(false)}><form className="space-y-4" onSubmit={e => { e.preventDefault(); reviewAction('vault', vaultForm); }}><p className="rounded-lg bg-[#f5f5f2] p-4 text-sm">My holding: <strong>{money(dashboard?.superadminHolding)}</strong></p><label className="block text-xs">Amount (TK)<input required type="number" min="0.01" step="0.01" max={dashboard?.superadminHolding || 0} className={field + ' mt-2'} value={vaultForm.amount} onChange={e => setVaultForm({ ...vaultForm, amount: e.target.value })} /></label><label className="block text-xs">Note<input className={field + ' mt-2'} value={vaultForm.note} onChange={e => setVaultForm({ ...vaultForm, note: e.target.value })} /></label><p className="text-xs leading-6 text-[#888]">Record this only after moving the funds. It reduces your holding and increases the recorded vault transfers.</p><button disabled={vaultBusy} className={primary}>Review transfer</button></form></Modal>
      <Modal open={!!review} title="Review money movement" busy={reviewing} onClose={() => setReview(null)}><div className="space-y-4 text-sm"><p className="text-xs leading-6 text-[#888]">{review?.kind === 'request' ? 'Submit a request for superadmin review. Your outstanding balance stays unchanged until confirmed.' : review?.kind === 'vault' ? 'Record funds moving from your holding into the vault.' : 'Confirm that you have received these funds. This immediately reduces the sending admin balance and adds to your holding.'}</p><div className="rounded-lg bg-[#fafaf8] p-4"><p className="mt-0">{review?.target?.adminName || adminData.name}</p><strong className="block text-2xl">{money(review?.form?.amount)}</strong><p className="mb-0 text-xs text-[#888]">{review?.form?.paymentMethod || 'Internal transfer'} {review?.form?.transactionId && ' / ' + review.form.transactionId}</p></div><button disabled={reviewing} className={primary} onClick={performReviewed}>{reviewing ? 'Recording...' : review?.kind === 'request' ? 'Submit request' : 'Confirm recorded movement'}</button></div></Modal>
    </div>
  );
};

export default SettlementDashboard;
