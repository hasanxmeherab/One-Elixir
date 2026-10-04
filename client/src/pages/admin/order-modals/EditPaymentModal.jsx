const EditPaymentModal = ({
  order,
  form,
  setForm,
  uploading,
  onSave,
  onClose,
}) => {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-[3000]"
      onClick={onClose}
    >
      <div
        className="bg-white p-8 w-[400px] flex flex-col gap-2.5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[13px] tracking-[2px] m-0 font-bold">EDIT PAYMENT INFO</h3>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-lg cursor-pointer text-gray-400"
          >
            ×
          </button>
        </div>

        <p className="text-[11px] text-gray-400 mb-1">
          {order.paymentMethod} — {order.customerName}
        </p>

        <div className="flex flex-col gap-2.5">
          <input
            type="tel"
            placeholder="Sender Number"
            inputMode="numeric"
            value={form.senderNumber}
            onChange={e => setForm({ ...form, senderNumber: e.target.value.replace(/\D/g, '') })}
            className="p-2.5 border border-[#ddd] text-[13px] outline-none"
          />

          <input
            type="text"
            placeholder="Transaction ID"
            value={form.transactionId}
            onChange={e => setForm({ ...form, transactionId: e.target.value })}
            className="p-2.5 border border-[#ddd] text-[13px] outline-none"
          />

          <label
            className={`flex flex-col items-center gap-1.5 p-4 border-2 border-dashed cursor-pointer rounded transition-colors ${
              form.screenshot || form.screenshotUrl
                ? 'border-black bg-green-50'
                : 'border-[#ddd] bg-[#fafafa]'
            }`}
          >
            <span className="text-[11px] font-bold tracking-wider">
              {form.screenshot
                ? '✓ ' + form.screenshot.name
                : form.screenshotUrl
                ? '✓ SCREENSHOT SAVED — CLICK TO REPLACE'
                : 'CLICK TO UPLOAD SCREENSHOT'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => setForm({ ...form, screenshot: e.target.files[0] })}
            />
          </label>

          {form.screenshotUrl && !form.screenshot && (
            <img
              src={form.screenshotUrl}
              alt="Current screenshot"
              className="w-full max-h-[160px] object-contain border border-[#eee]"
            />
          )}
        </div>

        <button
          onClick={onSave}
          disabled={uploading}
          className={`bg-black text-white border-none p-2.5 cursor-pointer font-bold mt-4 tracking-wider transition-opacity ${
            uploading ? 'opacity-60' : ''
          }`}
        >
          {uploading ? 'SAVING...' : 'SAVE PAYMENT INFO'}
        </button>
      </div>
    </div>
  );
};

export default EditPaymentModal;
