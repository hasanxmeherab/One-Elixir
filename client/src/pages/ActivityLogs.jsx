import React, { useState, useEffect } from 'react';
import adminAxios from '../utils/adminAxios';
import { RefreshCw, Trash2, Filter } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ACTION_COLORS = {
  CREATE_PRODUCT: 'bg-green-100 text-green-800',
  UPDATE_PRODUCT: 'bg-blue-100 text-blue-800',
  DELETE_PRODUCT: 'bg-red-100 text-red-800',
  RESTORE_STOCK:  'bg-yellow-100 text-yellow-800',
  CREATE_ADMIN:   'bg-purple-100 text-purple-800',
  DELETE_ADMIN:   'bg-red-100 text-red-800',
  LOGIN:          'bg-gray-100 text-gray-600',
};

const ActivityLogs = () => {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterAdmin, setFilterAdmin] = useState('');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await adminAxios.get(`${API_URL}/api/logs?limit=200`);
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleClear = async () => {
    if (!window.confirm('Clear all activity logs? This cannot be undone.')) return;
    try {
      await adminAxios.delete(`${API_URL}/api/logs`);
      setLogs([]);
    } catch { toast.error('Failed to clear logs'); }
  };

  const actionTypes = ['ALL', ...new Set(logs.map(l => l.action))];

  const filtered = logs.filter(log => {
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    const matchesAdmin  = !filterAdmin || log.adminName.toLowerCase().includes(filterAdmin.toLowerCase());
    return matchesAction && matchesAdmin;
  });

  return (
    <div className="p-4 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h3 className="tracking-[2px] font-bold text-lg">ACTIVITY LOGS</h3>
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 border border-[#ddd] text-xs tracking-wider hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={13} /> REFRESH
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-500 text-xs tracking-wider hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} /> CLEAR ALL
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-[#f9f9f9] border border-[#eee]">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-[#888]" />
          <span className="text-[10px] tracking-wider text-[#888]">FILTER</span>
        </div>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-1.5 border border-[#ddd] text-xs outline-none bg-white"
        >
          {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          placeholder="Filter by admin name..."
          value={filterAdmin}
          onChange={e => setFilterAdmin(e.target.value)}
          className="px-3 py-1.5 border border-[#ddd] text-xs outline-none"
        />
        <span className="text-[10px] text-[#aaa] self-center">{filtered.length} entries</span>
      </div>

      {/* Logs Table */}
      {loading ? (
        <p className="text-center text-xs text-[#aaa] tracking-widest py-20">LOADING LOGS...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-xs text-[#aaa] py-20">No activity logs found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[#eee]">
                <th className="py-3 px-3 text-[10px] text-[#999] font-bold tracking-wider">TIME</th>
                <th className="py-3 px-3 text-[10px] text-[#999] font-bold tracking-wider">ADMIN</th>
                <th className="py-3 px-3 text-[10px] text-[#999] font-bold tracking-wider">ACTION</th>
                <th className="py-3 px-3 text-[10px] text-[#999] font-bold tracking-wider">DETAIL</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log._id} className="border-b border-[#f5f5f5] hover:bg-[#fafafa]">
                  <td className="py-3 px-3 text-xs text-[#888] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-3 text-xs font-bold tracking-wider whitespace-nowrap">
                    {log.adminName}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 text-[9px] font-bold tracking-wider rounded ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-[#444] max-w-[400px]">
                    {log.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;