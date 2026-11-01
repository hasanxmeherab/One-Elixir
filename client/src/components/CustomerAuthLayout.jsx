import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const input = 'w-full rounded-xl border border-[#e4dfd8] bg-[#fffdfb] px-3.5 py-[9px] text-base sm:py-2.5 text-[#322c28] outline-none transition placeholder:text-[#b3aaa1] focus:border-[#b96a50] focus:ring-4 focus:ring-[#b96a50]/10 disabled:opacity-60 sm:text-sm';

export default function CustomerAuthLayout({ mode, children }) {
  const signup = mode === 'signup';
  return <main className="flex min-h-[calc(100dvh-116px)] items-center bg-[#f8f5f0] px-3 py-1 text-[#302a26] sm:px-5 sm:py-3 lg:px-8 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#b96a50] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#b96a50]">
    <div className="mx-auto grid w-full max-w-[1000px] overflow-hidden rounded-2xl border border-[#e8e0d5] bg-white shadow-[0_20px_70px_-40px_rgba(71,45,25,0.3)] md:grid-cols-[.85fr_1.15fr]">
      <aside className="relative isolate hidden flex-col overflow-hidden bg-[#eee5d7] p-7 md:flex lg:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-1/3 -z-10 h-80 w-80 rounded-full bg-[#c8ac85]/15 blur-3xl" />
        <div className="flex items-center justify-between gap-4"><span className="text-[10px] font-semibold tracking-[.2em] text-[#8c7057]">THE ONEELIXIR COLLECTION</span><span className="h-px w-10 bg-[#ad9173]/40" /></div>
        <div className="flex items-center justify-between gap-0 md:flex-1 md:flex-col md:justify-center">
          <div className="w-full py-4"><p className="mb-2 hidden text-[9px] tracking-[.16em] text-[#a18d79] lg:block">SMALL BATCH. PERSONAL EXPRESSION.</p><h2 className="m-0 max-w-xs text-3xl leading-[1.12] tracking-tight lg:text-[38px]">A little scent.<br /><span className="italic text-[#9b5d46]">A lasting impression.</span></h2></div>
          <div className="relative my-2 flex h-[clamp(130px,23dvh,210px)] w-full shrink-0 items-center justify-center"><ScentArtwork /></div>
          <div className="hidden w-full md:block"><div className="mb-2 flex flex-wrap gap-2 text-[8px] tracking-[.16em] text-[#9a7b60]">{['WOODY', 'FLORAL', 'AMBER'].map(note => <span key={note} className="rounded-full border border-[#d6c3ac]/80 px-2.5 py-1">{note}</span>)}</div><p className="m-0 text-sm font-medium text-[#8a6a51]">A world of notes. A scent of your own.</p></div>
        </div>
        <div className="hidden items-end justify-between gap-3 border-t border-[#d6c5af]/70 pt-3 md:flex"><p className="m-0 max-w-56 text-[11px] leading-5 text-[#99816b]">Explore scent profiles, save your favourites, and find the one that feels like you.</p><Link to="/collection" aria-label="Explore the fragrance collection" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#cdb99f] text-[#85664b] transition hover:bg-white/50"><ArrowUpRight size={17} /></Link></div>
      </aside>
      <section className="relative px-5 py-4 sm:px-8 sm:py-5 lg:px-10" aria-labelledby="customer-auth-heading">
        <div aria-hidden="true" className="pointer-events-none absolute right-1 top-1 h-28 w-28 opacity-10 md:hidden"><ScentArtwork /></div>
        <div className="relative mb-2 hidden items-center gap-2 sm:flex text-[9px] font-semibold tracking-[.18em] text-[#b07a5c]"><span className="h-px w-5 bg-[#c1a080]" />YOUR ONEELIXIR ACCOUNT</div>
        <h1 id="customer-auth-heading" className="m-0 relative text-[28px] leading-tight tracking-tight lg:text-[32px]">{signup ? 'Create your account.' : 'Welcome back.'}</h1>
        <p className="relative mb-3 mt-1.5 text-xs leading-5 text-[#9a9086]">{signup ? 'Save favourites. Keep your orders close.' : 'Your favourite fragrances are waiting for you.'}</p>
        {children}
      </section>
    </div>
  </main>;
}

function ScentArtwork() {
  const id = useId();
  return <svg viewBox="0 0 340 320" aria-hidden="true" focusable="false" className="h-full w-full overflow-visible">
    <defs>
      <linearGradient id={`${id}-amber`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff9ee" stopOpacity=".85" /><stop offset=".45" stopColor="#d7ad7c" stopOpacity=".45" /><stop offset="1" stopColor="#9c5d35" stopOpacity=".55" /></linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fffdf8" stopOpacity=".7" /><stop offset=".5" stopColor="#f9e3bd" stopOpacity=".08" /><stop offset="1" stopColor="#d9b895" stopOpacity=".3" /></linearGradient>
      <radialGradient id={`${id}-glow`}><stop offset="0" stopColor="#c89560" stopOpacity=".18" /><stop offset="1" stopColor="#c89560" stopOpacity="0" /></radialGradient>
    </defs>
    <circle cx="183" cy="166" r="146" fill={`url(#${id}-glow)`} />
    <circle cx="183" cy="146" r="113" fill="none" stroke="#cdb69a" strokeWidth=".7" opacity=".6" />
    <circle cx="183" cy="146" r="98" fill="none" stroke="#cdb69a" strokeWidth=".5" opacity=".35" />
    <ellipse cx="189" cy="286" rx="91" ry="7" fill="#a4815b" opacity=".09" />
    <rect x="115" y="64" width="112" height="216" rx="56" fill={`url(#${id}-amber)`} stroke="#bd9970" strokeOpacity=".4" />
    <path d="M129 213V120c0-27 17-42 35-45" fill="none" stroke="#fffdf4" strokeWidth="2" strokeLinecap="round" opacity=".6" />
    <rect x="188" y="128" width="73" height="151" rx="36.5" transform="rotate(14 224 204)" fill={`url(#${id}-glass)`} stroke="#c2a482" strokeOpacity=".45" />
    <path d="M259 56c0 0-13 17-13 25a13 13 0 0 0 26 0c0-8-13-25-13-25Z" fill="#c4915f" opacity=".3" />
    <g fill="none" stroke="#8a8b68" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity=".65">
      <path d="M83 282c7-51 3-100-15-150M84 245c-22-8-33-20-34-37 18 2 28 13 34 37ZM84 222c16-12 23-26 20-41-16 9-22 22-20 41ZM80 199c-18-9-25-23-24-39 15 6 23 20 24 39ZM76 177c11-12 14-25 10-39-12 10-16 23-10 39ZM68 150c-13-10-18-23-15-37 12 8 17 20 15 37Z" />
    </g>
    <path d="M126 302h133" stroke="#b79a78" strokeWidth=".7" opacity=".35" />
    <circle cx="286" cy="181" r="3" fill="#bb8e65" opacity=".3" />
    <circle cx="103" cy="73" r="2" fill="#bb8e65" opacity=".45" />
  </svg>;
}

export function AuthField({ id, label, children, ...props }) {
  return <div><label htmlFor={id} className="mb-1 block text-[11px] font-medium text-[#6e6257]">{label}</label>{children || <input id={id} className={input} {...props} />}</div>;
}
export function AuthPassword({ id, label = 'Password', visible, onToggle, ...props }) {
  return <AuthField id={id} label={label}><div className="relative"><input id={id} className={`${input} pr-12`} type={visible ? 'text' : 'password'} {...props} /><button type="button" disabled={props.disabled} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={onToggle} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[#a19387] hover:text-[#5d4333]">{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></AuthField>;
}
export function AuthSubmit({ loading, children, disabled = false }) {
  return <button type="submit" disabled={loading || disabled} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#322b26] px-5 py-3 text-sm sm:py-2.5 font-medium text-[#fff9f1] transition hover:bg-[#554034] disabled:cursor-not-allowed disabled:opacity-55">{loading && <LoaderCircle size={16} className="animate-spin" />}{children}</button>;
}
export function AuthGoogle({ signup = false, disabled, onSuccess, onError }) {
  return <><div className="my-2.5 flex items-center gap-3 sm:my-3"><span className="h-px flex-1 bg-[#eee7df]" /><span className="text-[10px] text-[#b0a59a]">or continue with</span><span className="h-px flex-1 bg-[#eee7df]" /></div><div inert={disabled} className={`flex min-h-8 justify-center ${disabled ? 'opacity-50' : ''}`}><GoogleLogin onSuccess={onSuccess} onError={onError} theme="outline" shape="pill" size="medium" text={signup ? 'signup_with' : 'signin_with'} /></div></>;
}
