const OrderNotesModal = ({
  order,
  noteText,
  setNoteText,
  onAddNote,
  onClose,
}) => {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-[3000]"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 w-[420px] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[13px] tracking-[2px] m-0 font-bold">ORDER NOTES</h3>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-lg cursor-pointer text-gray-400"
          >
            ×
          </button>
        </div>

        <p className="text-[11px] text-[#888] mb-3">
          #{order._id.slice(-6).toUpperCase()} — {order.customerName}
        </p>

        {/* Existing notes */}
        <div className="flex-1 overflow-y-auto mb-4 max-h-[300px]">
          {!order.adminNotes || order.adminNotes.length === 0 ? (
            <p className="text-xs text-[#ccc] text-center py-6">No notes yet.</p>
          ) : (
            order.adminNotes.map((note, i) => (
              <div key={i} className="border-b border-[#f0f0f0] py-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-[#555]">{note.adminName}</span>
                  <span className="text-[9px] text-[#aaa]">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-[12px] text-[#333] leading-relaxed">{note.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Add note */}
        <div className="flex gap-2 border-t border-[#eee] pt-3">
          <input
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note..."
            onKeyDown={e => e.key === 'Enter' && onAddNote()}
            className="flex-1 p-2.5 border border-[#ddd] text-[13px] outline-none"
          />
          <button
            onClick={onAddNote}
            disabled={!noteText.trim()}
            className="bg-black text-white border-none px-4 cursor-pointer font-bold text-[11px] disabled:opacity-40"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderNotesModal;
