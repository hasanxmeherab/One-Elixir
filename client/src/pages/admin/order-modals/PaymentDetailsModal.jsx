const PaymentDetailsModal = ({ payment, onClose }) => {
  if (!payment) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-[3000]"
      onClick={onClose}
    >
      <div
        className="bg-white p-8 w-[350px] flex flex-col gap-2.5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[13px] tracking-[2px] m-0 font-bold">PAYMENT DETAILS</h3>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-lg cursor-pointer text-gray-400"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {payment.platform && (
            <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
              <span className="text-[10px] font-bold tracking-wider text-gray-400">PLATFORM</span>
              <span className="text-xs text-gray-600">{payment.platform}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
            <span className="text-[10px] font-bold tracking-wider text-gray-400">SENDER NUMBER</span>
            <span className="text-xs text-gray-600">{payment.senderNumber || '—'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
            <span className="text-[10px] font-bold tracking-wider text-gray-400">TRANSACTION ID</span>
            <span className="text-xs font-mono font-bold text-black tracking-wider">
              {payment.transactionId || '—'}
            </span>
          </div>
          {payment.amountPaid && (
            <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
              <span className="text-[10px] font-bold tracking-wider text-gray-400">AMOUNT PAID</span>
              <span className="text-xs font-bold text-emerald-700">{payment.amountPaid} TK</span>
            </div>
          )}
        </div>

        {payment.screenshot && (
          <div className="mt-2">
            <p className="text-[10px] font-bold tracking-wider text-gray-400 mb-2">PAYMENT SCREENSHOT</p>
            <a href={payment.screenshot} target="_blank" rel="noreferrer">
              <img
                src={payment.screenshot}
                alt="Payment proof"
                className="w-full max-h-[280px] object-contain border border-[#eee] cursor-zoom-in"
              />
              <p className="text-[10px] text-gray-400 text-center mt-1">Click to open full size</p>
            </a>
          </div>
        )}

        <button
          onClick={onClose}
          className="bg-black text-white border-none p-2.5 cursor-pointer font-bold mt-4 tracking-wider"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};

export default PaymentDetailsModal;
