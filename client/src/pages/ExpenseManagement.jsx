import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';



// Returns today's date in local timezone as YYYY-MM-DD
const getLocalDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const PAGE_SIZE = 10;

// ── Reusable Pagination ───────────────────────────────────────
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
        className="px-4 py-2 border border-[#ddd] text-xs font-bold tracking-wider disabled:opacity-30 hover:border-black transition-colors cursor-pointer bg-white">
        ← PREV
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
        <button key={n} onClick={() => onPageChange(n)}
          className={`w-9 h-9 text-xs font-bold border transition-colors cursor-pointer ${
            n === page ? 'bg-black text-white border-black' : 'bg-white border-[#ddd] hover:border-black'
          }`}>
          {n}
        </button>
      ))}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
        className="px-4 py-2 border border-[#ddd] text-xs font-bold tracking-wider disabled:opacity-30 hover:border-black transition-colors cursor-pointer bg-white">
        NEXT →
      </button>
    </div>
  );
};

const ExpenseManagement = () => {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState({
    title: '', amount: '', quantity: '', unitPrice: '',
    unit: 'pcs', category: 'Packaging',
    date: getLocalDate()
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  }).reduce((acc, exp) => acc + Number(exp.amount), 0);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/expenses`);
      setExpenses(res.data);
    } catch (err) { console.error("Failed to fetch expenses", err); }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handlePriceChange = (field, val) => {
    const updatedForm = { ...formData, [field]: val };
    if (updatedForm.quantity && updatedForm.unitPrice) {
      updatedForm.amount = Number(updatedForm.quantity) * Number(updatedForm.unitPrice);
    }
    setFormData(updatedForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/expenses`, formData);
      setFormData({
        title: '', amount: '', quantity: '', unitPrice: '',
        unit: 'pcs', category: 'Packaging',
        date: getLocalDate()
      });
      fetchExpenses();
      toast.success("Expense logged successfully!");
    } catch (err) { toast.error("Failed to save expense."); }
  };

  const deleteExpense = async (id) => {
    if (window.confirm("Delete this expense record?")) {
      await axios.delete(`${API_URL}/api/expenses/${id}`);
      fetchExpenses();
    }
  };

  const totalPages       = Math.ceil(expenses.length / PAGE_SIZE);
  const paginatedExpenses = expenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h3 className="tracking-[3px] mb-8 font-bold">EXPENSE MANAGEMENT</h3>

      {/* Summary Boxes */}
      <div className="flex gap-5 mb-10 flex-wrap">
        <div className="flex-1 min-w-[150px] p-6 bg-white border border-[#eee] border-l-4 border-l-black">
          <span className="block text-[10px] text-[#888] font-bold tracking-[2px] mb-2.5">THIS MONTH'S SPEND</span>
          <span className="text-xl font-bold">{monthlyExpenses.toLocaleString()} TK</span>
        </div>
        <div className="flex-1 min-w-[150px] p-6 bg-white border border-[#eee] border-l-4 border-l-black">
          <span className="block text-[10px] text-[#888] font-bold tracking-[2px] mb-2.5">TOTAL EXPENDITURE</span>
          <span className="text-xl font-bold">{totalExpenses.toLocaleString()} TK</span>
        </div>
      </div>

      {/* Log Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-[#fcfcfc] p-8 border border-[#eee] mb-12">
        <p className="text-[11px] font-bold tracking-wider">LOG NEW EXPENDITURE</p>

        <div className="flex gap-2.5 flex-col sm:flex-row">
          <input
            type="text" placeholder="Description" required
            value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
            className="flex-[2] p-3 border border-[#ddd] outline-none text-sm bg-white"
          />
          <select
            value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
            className="flex-1 p-3 border border-[#ddd] outline-none text-sm bg-white"
          >
            <option value="Packaging">Packaging (Bottles/Boxes)</option>
            <option value="Ingredients">Ingredients (Oil/Alcohol)</option>
            <option value="Marketing">Marketing/Ads</option>
            <option value="Tools">Tools/Equipment</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="flex gap-2.5 flex-wrap">
          <div className="flex flex-[1.5] gap-1.5 min-w-[150px]">
            <input
              type="number" placeholder="Qty"
              value={formData.quantity} onChange={e => handlePriceChange('quantity', e.target.value)}
              className="flex-1 p-3 border border-[#ddd] outline-none text-sm bg-white"
            />
            <select
              value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
              className="w-[80px] p-3 border border-[#ddd] outline-none text-sm bg-white"
            >
              <option value="pcs">pcs</option>
              <option value="ml">ml</option>
              <option value="ltr">ltr</option>
              <option value="kg">kg</option>
              <option value="gm">gm</option>
              <option value="pkt">pkt</option>
            </select>
          </div>
          <input
            type="number" placeholder="Unit Price"
            value={formData.unitPrice} onChange={e => handlePriceChange('unitPrice', e.target.value)}
            className="flex-1 min-w-[100px] p-3 border border-[#ddd] outline-none text-sm bg-white"
          />
          <input
            type="number" placeholder="Total (TK)" required
            value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
            className="flex-1 min-w-[100px] p-3 border border-[#ddd] outline-none text-sm bg-[#f9f9f9]"
          />
          <input
            type="date"
            value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
            className="flex-1 min-w-[120px] p-3 border border-[#ddd] outline-none text-sm bg-white"
          />
        </div>

        <button
          type="submit"
          className="p-4 bg-black text-white border-none cursor-pointer font-bold tracking-[2px] text-xs hover:bg-gray-800 transition-colors"
        >
          SAVE EXPENSE
        </button>
      </form>

      {/* History Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-black">
              {['DATE', 'TITLE', 'CATEGORY', 'DETAILS (QTY x PRICE)', 'TOTAL', 'ACTION'].map(h => (
                <th key={h} className="py-4 px-2.5 text-[11px] text-[#888] tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedExpenses.map(exp => (
              <tr key={exp._id} className="border-b border-[#eee]">
                <td className="py-4 px-2.5 text-sm">{new Date(exp.date).toLocaleDateString()}</td>
                <td className="py-4 px-2.5 text-sm">{exp.title}</td>
                <td className="py-4 px-2.5 text-sm">{exp.category}</td>
                <td className="py-4 px-2.5 text-sm text-[#666]">
                  {exp.quantity && exp.unitPrice ? (
                    <span>{exp.quantity} {exp.unit || 'pcs'} x {Number(exp.unitPrice).toLocaleString()} TK</span>
                  ) : (
                    <span className="text-[#ccc]">—</span>
                  )}
                </td>
                <td className="py-4 px-2.5 text-sm font-bold">{Number(exp.amount).toLocaleString()} TK</td>
                <td className="py-4 px-2.5 text-sm">
                  <button
                    onClick={() => deleteExpense(exp._id)}
                    className="text-red-500 border-none bg-transparent cursor-pointer text-[11px] underline font-bold hover:opacity-70 transition-opacity"
                  >
                    REMOVE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default ExpenseManagement;