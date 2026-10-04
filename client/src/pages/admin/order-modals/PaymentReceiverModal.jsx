const PaymentReceiverModal = ({
  receiverModal,
  selectedReceiver,
  setSelectedReceiver,
  adminList,
  adminData,
  selectedCount,
  onConfirm,
  onClose,
}) => {
  if (!receiverModal) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-[3000]"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 w-[380px] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[13px] tracking-[2px] m-0 font-bold">WHO RECEIVED PAYMENT?</h3>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-lg cursor-pointer text-gray-400"
          >
            ×
          </button>
        </div>

        <p className="text-[11px] text-[#888] mb-4">
          {receiverModal.bulk
            ? `Select the admin who received payment for ${selectedCount} order(s).`
            : 'Select the admin who received this payment.'}
        </p>

        <div className="flex flex-col gap-1.5 mb-5 max-h-[300px] overflow-y-auto">
          {adminList.map(admin => (
            <label
              key={admin._id}
              className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${
                selectedReceiver === admin._id
                  ? 'border-black bg-gray-50'
                  : 'border-[#eee] hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="paymentReceiver"
                value={admin._id}
                checked={selectedReceiver === admin._id}
                onChange={() => setSelectedReceiver(admin._id)}
                className="cursor-pointer"
              />
              <div className="flex-1">
                <div className="text-[12px] font-bold">
                  {admin.name}
                  {admin._id === adminData?.id && (
                    <span className="ml-2 text-[9px] bg-black text-white px-1.5 py-0.5 rounded-sm">
                      YOU
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400">
                  {admin.role === 'superadmin' ? '⭐ Super Admin (Cashier)' : 'Admin'}
                </div>
              </div>
            </label>
          ))}
          {adminList.length === 0 && (
            <p className="text-[11px] text-[#ccc] text-center py-6">Loading admins...</p>
          )}
        </div>

        <button
          onClick={onConfirm}
          disabled={!selectedReceiver}
          className="w-full bg-black text-white border-none p-3 cursor-pointer font-bold tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          CONFIRM PAYMENT RECEIVED
        </button>
      </div>
    </div>
  );
};

export default PaymentReceiverModal;
