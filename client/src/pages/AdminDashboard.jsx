import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { perfumes = [], orders = [], investments = [] } = useOutletContext();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState(null);

  if (!perfumes || !orders) {
    return <div className="p-10 text-center">Loading Dashboard Data...</div>;
  }

  const lowStockItems = perfumes.filter(p => p.stock > 0 && p.stock <= 5);
  const outOfStockItems = perfumes.filter(p => p.stock === 0);
  const totalStock = perfumes.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const totalValuation = perfumes.reduce((acc, p) => acc + (p.price * (Number(p.stock) || 0)), 0);
  const totalRevenue = orders
    .filter(o => o.status?.toLowerCase() === 'delivered')
    .reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  const totalInvestment = (investments || []).reduce((acc, inv) => {
    const val = parseFloat(inv.totalAmount);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div>
      <h3 className="tracking-[3px] mb-8 font-bold">DASHBOARD OVERVIEW</h3>

      {/* Top Stats */}
      <div className="flex gap-5 flex-wrap">
        <div className="flex-1 min-w-[150px] p-6 bg-white border border-[#eee] border-l-4 border-l-black">
          <span className="block text-[10px] text-[#888] font-bold tracking-[2px] mb-2.5">TOTAL REVENUE</span>
          <span className="text-xl font-bold">{totalRevenue.toLocaleString()} TK</span>
        </div>
        <div className="flex-1 min-w-[150px] p-6 bg-white border border-[#eee] border-l-4 border-l-black">
          <span className="block text-[10px] text-[#888] font-bold tracking-[2px] mb-2.5">TOTAL CAPITAL</span>
          <span className="text-xl font-bold">{totalInvestment.toLocaleString()} TK</span>
        </div>
        <div className="flex-1 min-w-[150px] p-6 bg-white border border-[#eee] border-l-4 border-l-black">
          <span className="block text-[10px] text-[#888] font-bold tracking-[2px] mb-2.5">INVENTORY VALUE</span>
          <span className="text-xl font-bold">{totalValuation.toLocaleString()} TK</span>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="flex gap-5 flex-wrap mt-5">
        <div className="flex-1 min-w-[150px] p-6 bg-white border border-[#eee] border-l-4 border-l-black">
          <span className="block text-[10px] text-[#888] font-bold tracking-[2px] mb-2.5">TOTAL UNITS</span>
          <span className="text-xl font-bold">{totalStock}</span>
        </div>

        <div
          onClick={() => setFilterType(filterType === 'low' ? null : 'low')}
          className={`flex-1 min-w-[150px] p-6 border border-[#eee] border-l-4 border-l-[#f39c12] cursor-pointer transition-colors ${filterType === 'low' ? 'bg-[#fff9f0]' : 'bg-white'}`}
        >
          <span className="block text-[10px] text-[#f39c12] font-bold tracking-[2px] mb-2.5">LOW STOCK (VIEW)</span>
          <span className="text-xl font-bold text-[#f39c12]">{lowStockItems.length}</span>
        </div>

        <div
          onClick={() => setFilterType(filterType === 'out' ? null : 'out')}
          className={`flex-1 min-w-[150px] p-6 border border-[#eee] border-l-4 border-l-[#e74c3c] cursor-pointer transition-colors ${filterType === 'out' ? 'bg-[#fff5f5]' : 'bg-white'}`}
        >
          <span className="block text-[10px] text-[#e74c3c] font-bold tracking-[2px] mb-2.5">OUT OF STOCK (VIEW)</span>
          <span className="text-xl font-bold text-[#e74c3c]">{outOfStockItems.length}</span>
        </div>
      </div>

      {/* Dynamic Alert List */}
      {filterType && (
        <div className="mt-8 p-6 bg-white border border-black">
          <div className="flex justify-between mb-4">
            <p className="font-bold text-[11px] tracking-wider">
              {filterType === 'low' ? '⚠️ LOW STOCK ITEMS' : '🚫 OUT OF STOCK ITEMS'}
            </p>
            <button
              onClick={() => setFilterType(null)}
              className="bg-transparent border-none text-[#888] cursor-pointer text-[10px] underline"
            >
              CLOSE
            </button>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {(filterType === 'low' ? lowStockItems : outOfStockItems).map(item => (
              <div key={item._id} className="flex justify-between items-center py-4 border-b border-[#eee]">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className={`text-[11px] ${filterType === 'low' ? 'text-[#f39c12]' : 'text-[#e74c3c]'}`}>
                    Current Stock: {item.stock}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/admin/inventory')}
                  className="bg-black text-white border-none px-3 py-1.5 text-[10px] cursor-pointer font-bold rounded hover:bg-gray-800 transition-colors"
                >
                  RESTOCK →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;