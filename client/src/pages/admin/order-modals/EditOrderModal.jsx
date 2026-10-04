const EditOrderModal = ({
  editOrder,
  editForm,
  setEditForm,
  perfumes,
  addEditItem,
  removeEditItem,
  updateEditItem,
  calcEditTotal,
  editSaving,
  onSave,
  onClose,
}) => {
  if (!editOrder || !editForm) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-[3000] overflow-y-auto py-10"
      onClick={onClose}
    >
      <div
        className="bg-white p-5 sm:p-6 w-[95vw] max-w-[650px] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[13px] tracking-[2px] m-0 font-bold">
            EDIT ORDER #{editOrder._id.slice(-6).toUpperCase()}
          </h3>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-lg cursor-pointer text-gray-400"
          >
            ×
          </button>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">
              CUSTOMER NAME *
            </label>
            <input
              value={editForm.customerName}
              onChange={e => setEditForm({ ...editForm, customerName: e.target.value })}
              className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">
              PHONE *
            </label>
            <input
              value={editForm.phone}
              onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">
              ADDRESS
            </label>
            <input
              value={editForm.address}
              onChange={e => setEditForm({ ...editForm, address: e.target.value })}
              className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">
              EMAIL
            </label>
            <input
              value={editForm.customerEmail}
              onChange={e => setEditForm({ ...editForm, customerEmail: e.target.value })}
              className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">
              PAYMENT METHOD
            </label>
            <select
              value={editForm.paymentMethod}
              onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value })}
              className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none cursor-pointer box-border"
            >
              <option value="Cash on Delivery">Cash on Delivery</option>
              <option value="Full Payment">Full Payment</option>
              <option value="Bkash">Bkash</option>
              <option value="Nagad">Nagad</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold tracking-wider text-[#888] mb-1">
              ORDER DATE
            </label>
            <input
              type="datetime-local"
              value={editForm.orderDate}
              onChange={e => setEditForm({ ...editForm, orderDate: e.target.value })}
              className="w-full p-2.5 border border-[#ddd] text-[13px] outline-none box-border"
            />
          </div>
        </div>

        {/* Items */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-bold tracking-wider text-[#888]">ORDER ITEMS</label>
            <button
              onClick={addEditItem}
              className="text-[10px] font-bold border border-[#ddd] px-2 py-1 cursor-pointer hover:border-black transition-colors bg-white"
            >
              + ADD ITEM
            </button>
          </div>
          {editForm.items.map((item, idx) => {
            let itemSubtotal = item.price;
            if (item.discountType === 'percentage') {
              itemSubtotal = itemSubtotal - (itemSubtotal * item.discountValue) / 100;
            } else if (item.discountType === 'fixed') {
              itemSubtotal = itemSubtotal - (item.discountValue || 0);
            }
            itemSubtotal = Math.max(0, itemSubtotal) * item.quantity;

            return (
              <div key={idx} className="border border-[#eee] p-3 mb-2 rounded relative">
                {editForm.items.length > 1 && (
                  <button
                    onClick={() => removeEditItem(idx)}
                    className="absolute top-2 right-2 text-red-400 cursor-pointer bg-transparent border-none text-base hover:text-red-600"
                  >
                    ×
                  </button>
                )}
                {/* Row 1: Product selector */}
                <div className="mb-2">
                  <label className="text-[9px] text-[#aaa] block mb-0.5">Product</label>
                  <select
                    value={item.perfumeId || ''}
                    onChange={e => updateEditItem(idx, 'perfumeId', e.target.value)}
                    className="w-full p-1.5 border border-[#ddd] text-[11px] outline-none box-border"
                  >
                    <option value="">— Custom —</option>
                    {perfumes.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.price} TK)
                      </option>
                    ))}
                  </select>
                  {!item.perfumeId && (
                    <input
                      value={item.name}
                      onChange={e => updateEditItem(idx, 'name', e.target.value)}
                      placeholder="Item name"
                      className="w-full p-1.5 border border-[#ddd] text-[11px] outline-none mt-1 box-border"
                    />
                  )}
                </div>
                {/* Row 2: Price, Qty, Discount, Subtotal */}
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="w-20">
                    <label className="text-[9px] text-[#aaa] block mb-0.5">Price</label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={e => updateEditItem(idx, 'price', Number(e.target.value))}
                      className="w-full p-1.5 border border-[#ddd] text-[11px] outline-none box-border"
                    />
                  </div>
                  <div className="w-14">
                    <label className="text-[9px] text-[#aaa] block mb-0.5">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateEditItem(idx, 'quantity', Number(e.target.value) || 1)}
                      className="w-full p-1.5 border border-[#ddd] text-[11px] outline-none box-border"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#aaa] block mb-0.5">Discount</label>
                    <div className="flex gap-1">
                      <select
                        value={item.discountType}
                        onChange={e => updateEditItem(idx, 'discountType', e.target.value)}
                        className="p-1.5 border border-[#ddd] text-[10px] outline-none w-16"
                      >
                        <option value="none">None</option>
                        <option value="fixed">Fixed</option>
                        <option value="percentage">%</option>
                      </select>
                      {item.discountType !== 'none' && (
                        <input
                          type="number"
                          value={item.discountValue}
                          onChange={e => updateEditItem(idx, 'discountValue', Number(e.target.value))}
                          className="p-1.5 border border-[#ddd] text-[10px] outline-none w-14 box-border"
                        />
                      )}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <label className="text-[9px] text-[#aaa] block mb-0.5">Subtotal</label>
                    <p className="text-[12px] font-bold m-0">{itemSubtotal.toLocaleString()} TK</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shipping + Total */}
        <div className="flex flex-wrap items-center gap-4 border-t border-[#eee] pt-4">
          <div>
            <label className="text-[10px] font-bold text-[#888] block mb-1">SHIPPING</label>
            <input
              type="number"
              value={editForm.shippingCost}
              onChange={e => setEditForm({ ...editForm, shippingCost: Number(e.target.value) })}
              className="w-24 p-2 border border-[#ddd] text-sm outline-none box-border"
            />
          </div>
          <div className="ml-auto text-right">
            <span className="text-[10px] text-[#888] font-bold">GRAND TOTAL</span>
            <p className="text-xl font-bold m-0">{calcEditTotal(editForm).toLocaleString()} TK</p>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={editSaving}
          className="w-full bg-black text-white border-none p-3 cursor-pointer font-bold tracking-wider mt-5 hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {editSaving ? 'SAVING ORDER...' : 'SAVE CHANGES'}
        </button>
      </div>
    </div>
  );
};

export default EditOrderModal;
