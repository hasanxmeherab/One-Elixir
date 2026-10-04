const CustomerHistoryDrawer = ({ customerHistory, getStatusClass, onClose }) => {
  if (!customerHistory) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex justify-end z-[3000]"
      onClick={onClose}
    >
      <div
        className="bg-white w-[450px] h-full overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[13px] tracking-[2px] m-0 font-bold">CUSTOMER HISTORY</h3>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-lg cursor-pointer text-gray-400"
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <h4 className="text-lg font-bold mb-1">{customerHistory.name}</h4>
          <p className="text-sm text-[#666]">{customerHistory.phone}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 bg-[#f9f9f9] border border-[#eee] text-center">
            <p className="text-[10px] font-bold text-[#888] tracking-wider">TOTAL ORDERS</p>
            <p className="text-xl font-bold">{customerHistory.orders.length}</p>
          </div>
          <div className="p-3 bg-[#f9f9f9] border border-[#eee] text-center">
            <p className="text-[10px] font-bold text-[#888] tracking-wider">TOTAL SPENT</p>
            <p className="text-xl font-bold">{customerHistory.totalSpent.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-[#f9f9f9] border border-[#eee] text-center">
            <p className="text-[10px] font-bold text-[#888] tracking-wider">AVG ORDER</p>
            <p className="text-xl font-bold">
              {customerHistory.orders.length
                ? Math.round(
                    customerHistory.totalSpent /
                      (customerHistory.orders.filter(o => o.status?.toLowerCase() === 'delivered').length || 1)
                  ).toLocaleString()
                : 0}
            </p>
          </div>
        </div>

        <p className="text-[10px] font-bold text-[#888] tracking-wider mb-3">ORDER HISTORY</p>
        {customerHistory.orders.map(o => (
          <div key={o._id} className="border-b border-[#f0f0f0] py-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-mono text-[#888]">
                #{o._id.slice(-6).toUpperCase()}
              </span>
              <span
                className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${getStatusClass(o.status)}`}
              >
                {o.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-[#666]">
                {new Date(o.createdAt).toLocaleDateString()}
              </span>
              <span className="text-[12px] font-bold">{o.totalAmount.toLocaleString()} TK</span>
            </div>
            <div className="text-[10px] text-[#999] mt-1">
              {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerHistoryDrawer;
