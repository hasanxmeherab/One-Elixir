import { useState } from 'react';
import { X } from 'lucide-react';

const WHATSAPP_NUMBER = '8801636400363';
const WHATSAPP_MESSAGE = 'Hello! I have a question about your fragrances.';

export default function FloatingWhatsApp() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const defaultMessages = [
    "I'd like to know more about a product 🌸",
    "What are your delivery options? 🚚",
    "Do you offer custom fragrances? ✨",
  ];

  const openChat = (msg) => {
    const text = msg || message || WHATSAPP_MESSAGE;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setIsOpen(false);
    setMessage('');
  };

  return (
    <>
      {/* OVERLAY (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1999] md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* POPUP CHAT BOX */}
      <div
        className={`fixed bottom-[155px] md:bottom-[90px] right-5 z-[2000] w-[300px] bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="bg-[#25D366] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-[14px] leading-tight">OneElixir</p>
              <p className="text-white/80 text-[11px]">Typically replies instantly</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat bubble */}
        <div className="bg-[#ECE5DD] px-4 py-4">
          <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 shadow-sm max-w-[85%]">
            <p className="text-[13px] text-[#333] leading-relaxed">
              Hi there! 👋 How can we help you today?
            </p>
            <p className="text-[10px] text-[#aaa] mt-1 text-right">now</p>
          </div>
        </div>

        {/* Quick replies */}
        <div className="bg-white px-4 pt-3 pb-1 flex flex-col gap-2">
          {defaultMessages.map((msg, i) => (
            <button
              key={i}
              onClick={() => openChat(msg)}
              className="text-left text-[12px] text-[#25D366] border border-[#25D366] rounded-full px-3 py-1.5 hover:bg-[#25D366] hover:text-white transition-colors bg-transparent cursor-pointer"
            >
              {msg}
            </button>
          ))}
        </div>

        {/* Custom message input */}
        <div className="bg-white px-4 pt-2 pb-4 flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && openChat()}
            className="flex-1 border border-[#ddd] rounded-full px-4 py-2 text-[13px] outline-none focus:border-[#25D366]"
          />
          <button
            onClick={() => openChat()}
            className="w-9 h-9 rounded-full bg-[#25D366] border-none cursor-pointer flex items-center justify-center hover:bg-[#1ebe5d] transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* FLOATING BUTTON */}
      <div className="fixed bottom-20 md:bottom-5 right-5 z-[2000] flex items-center gap-3">
        {/* "Chat with us" label */}
        {!isOpen && (
          <div className="bg-white text-[#25D366] text-[13px] font-semibold px-4 py-2 rounded-full shadow-lg whitespace-nowrap border border-[#25D366] animate-[chatLabel_4s_ease-in-out_infinite]">
            Chat With Us
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Chat on WhatsApp"
          className="relative w-[46px] h-[46px] rounded-full bg-[#25D366] border-none cursor-pointer shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl"
        >
          {isOpen ? (
            <X size={26} className="text-white" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          )}
          {/* Slow pulse ring */}
          {!isOpen && (
            <span className="absolute w-full h-full rounded-full bg-[#25D366] opacity-30 animate-[slowPing_2.5s_ease-in-out_infinite]" />
          )}
        </button>
      </div>

      <style>{`
        @keyframes slowPing {
          0%   { transform: scale(1);   opacity: 0.3; }
          50%  { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1);   opacity: 0; }
        }
        @keyframes chatLabel {
          0%   { opacity: 0; transform: translateX(10px); }
          10%  { opacity: 1; transform: translateX(0); }
          70%  { opacity: 1; transform: translateX(0); }
          85%  { opacity: 0; transform: translateX(10px); }
          100% { opacity: 0; transform: translateX(10px); }
        }
      `}</style>
    </>
  );
}