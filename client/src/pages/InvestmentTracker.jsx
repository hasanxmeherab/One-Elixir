import React, { useState, useEffect } from 'react';
import adminAxios from '../utils/adminAxios';
import { useToast } from '../context/ToastContext';

const InvestmentTracker = () => {
  const toast = useToast();
  const [investments, setInvestments] = useState([]);
  const [newInvestorName, setNewInvestorName] = useState('');
  const [formData, setFormData] = useState({
    investorName: '', amount: '', note: '',
    date: new Date().toISOString().split('T')[0]
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const totalCapital = (investments || []).reduce((acc, inv) => {
    const val = parseFloat(inv.totalAmount);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const fullHistory = investments
    .flatMap(inv => (inv.transactions || []).map(t => ({
      ...t, investorName: inv.investorName, investorId: inv._id
    })))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const fetchData = async () => {
    try {
      const res = await adminAxios.get(`${API_URL}/api/investments`);
      setInvestments(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddInvestor = async (e) => {
    e.preventDefault();
    if (!newInvestorName) return;
    try {
      await adminAxios.post(`${API_URL}/api/investments/add`, { investorName: newInvestorName, amount: 0, note: 'New Account' });
      setNewInvestorName('');
      fetchData();
    } catch (err) { toast.error("An error occurred. Please try again."); }
  };

  const handleAddInvestment = async (e) => {
    e.preventDefault();
    try {
      await adminAxios.post(`${API_URL}/api/investments/add`, formData);
      setFormData({ ...formData, investorName: '', amount: '', note: '' });
      fetchData();
      toast.success("Investment recorded successfully!");
    } catch (err) { toast.error("Failed to record investment."); }
  };

  const removeTransaction = async (invId, transId) => {
    if (window.confirm("Remove this entry?")) {
      try {
        await adminAxios.delete(`${API_URL}/api/investments/${invId}/transaction/${transId}`);
        fetchData();
      } catch (err) { toast.error("An error occurred. Please try again."); }
    }
  };

  return (
    <div className="p-10">
      <h3 className="tracking-[4px] font-bold mb-10">INVESTMENT DASHBOARD</h3>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8 mb-12">
        {/* Total Capital */}
        <div className="bg-white border border-[#eee] p-8">
          <span className="block text-[10px] text-[#888] font-bold tracking-[2px] mb-2.5">TOTAL BUSINESS CAPITAL</span>
          <span className="text-3xl font-bold">{totalCapital.toLocaleString()} TK</span>
        </div>

        {/* Investor List & Create */}
        <div className="bg-white border border-[#eee] p-8">
          <span className="block text-[10px] text-[#888] font-bold tracking-[2px] mb-4">INVESTOR LIST & CREATE</span>
          <div className="flex gap-2.5 mb-4 items-stretch w-full">
            <input
              value={newInvestorName}
              onChange={e => setNewInvestorName(e.target.value)}
              placeholder="Name"
              className="flex-1 min-w-0 p-2 border border-[#ddd] outline-none text-sm"
            />
            <button
              onClick={handleAddInvestor}
              className="shrink-0 bg-black text-white border-none px-4 py-2 cursor-pointer font-bold text-xs hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              ADD
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {investments.map(inv => (
              <div key={inv._id} className="text-[10px] px-2.5 py-1 bg-[#f9f9f9] border border-[#ddd] rounded">
                {inv.investorName.toUpperCase()}: {inv.totalAmount.toLocaleString()} TK
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FORM */}
      <section className="bg-[#fcfcfc] p-8 border border-[#eee]">
        <p className="text-[11px] font-bold mb-5 block tracking-wider">RECORD NEW INVESTMENT</p>
        <form
          onSubmit={handleAddInvestment}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.5fr] gap-5 items-end"
        >
          <select
            value={formData.investorName}
            onChange={e => setFormData({...formData, investorName: e.target.value})}
            required
            className="p-3 border border-[#ddd] outline-none text-sm"
          >
            <option value="">-- Investor --</option>
            {investments.map(inv => (
              <option key={inv._id} value={inv.investorName}>{inv.investorName}</option>
            ))}
          </select>
          <input
            type="number" placeholder="Amount" required
            value={formData.amount}
            onChange={e => setFormData({...formData, amount: e.target.value})}
            className="p-3 border border-[#ddd] outline-none text-sm"
          />
          <input
            type="date"
            value={formData.date}
            onChange={e => setFormData({...formData, date: e.target.value})}
            className="p-3 border border-[#ddd] outline-none text-sm"
          />
          <button
            type="submit"
            className="p-3 bg-black text-white border-none cursor-pointer font-bold hover:bg-gray-800 transition-colors"
          >
            CONFIRM
          </button>
        </form>
      </section>

      {/* HISTORY TABLE */}
      <div className="overflow-x-auto mt-12">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-black">
              {['DATE', 'INVESTOR', 'AMOUNT', 'ACTION'].map(h => (
                <th key={h} className="py-4 px-2.5 text-[11px] text-[#888]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fullHistory.map((entry, idx) => (
              <tr key={idx} className="border-b border-[#eee]">
                <td className="py-4 px-2.5 text-sm">
                  {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="py-4 px-2.5 text-sm font-bold">{entry.investorName.toUpperCase()}</td>
                <td className="py-4 px-2.5 text-sm text-green-600 font-bold">{entry.amount.toLocaleString()} TK</td>
                <td className="py-4 px-2.5 text-sm">
                  <button
                    onClick={() => removeTransaction(entry.investorId, entry._id)}
                    className="text-red-500 border-none bg-transparent cursor-pointer text-[10px] hover:opacity-70 transition-opacity"
                  >
                    REMOVE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvestmentTracker;