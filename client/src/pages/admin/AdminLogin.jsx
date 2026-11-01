import { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, LoaderCircle, Package, ReceiptText, ChartNoAxesCombined } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import adminAxios from '../../utils/adminAxios';
import { useToast } from '../../context/ToastContext';

const AdminLogin = () => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Password setup state
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/admins/login`, { email, password });

      // Check if password change is required
      if (res.data.mustChangePassword) {
        localStorage.setItem('adminToken', res.data.accessToken);
        localStorage.setItem('adminRefreshToken', res.data.refreshToken);
        setCurrentPass(password); // remember current password for verification
        setMustChangePassword(true);
        toast.warning('You must set a new password before continuing.');
        return;
      }

      // Normal login
      localStorage.setItem('adminToken', res.data.accessToken);
      localStorage.setItem('adminRefreshToken', res.data.refreshToken);
      localStorage.setItem('adminData', JSON.stringify(res.data.admin));
      localStorage.setItem('adminRole', res.data.admin.role);
      localStorage.setItem('isAdminAuthenticated', 'true');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPass.length < 6) return toast.warning('New password must be at least 6 characters.');
    if (newPass !== confirmPass) return toast.warning('Passwords do not match.');
    if (newPass === currentPass) return toast.warning('New password must be different from the current one.');

    setChangingPass(true);
    try {
      await adminAxios.post(`${API_URL}/api/admins/change-password`, {
        currentPassword: currentPass,
        newPassword: newPass,
      });

      toast.success('Password updated! Logging you in...');

      // Re-login with the new password to get fresh tokens.
      const res = await axios.post(`${API_URL}/api/admins/login`, { email, password: newPass });
      localStorage.setItem('adminToken', res.data.accessToken);
      localStorage.setItem('adminRefreshToken', res.data.refreshToken);
      localStorage.setItem('adminData', JSON.stringify(res.data.admin));
      localStorage.setItem('adminRole', res.data.admin.role);
      localStorage.setItem('isAdminAuthenticated', 'true');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setChangingPass(false);
    }
  };

  const busy = loading || changingPass;
  const inputClass = 'w-full rounded-xl border border-[#dedfdf] bg-white py-3.5 pl-11 pr-12 text-base text-[#202427] outline-none transition placeholder:text-[#a2a5a7] focus:border-[#c06b51] focus:ring-4 focus:ring-[#c06b51]/10 disabled:bg-[#f4f5f5] sm:text-sm';
  const checkCapsLock = event => setCapsLock(event.getModifierState('CapsLock'));

  return (
    <main className="min-h-dvh bg-[#f4f4f1] p-4 text-[#202427] sm:p-7 lg:flex lg:items-center lg:justify-center lg:p-10 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#c06b51] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#c06b51]">
      <div className="mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-3xl border border-[#e2e3df] bg-white shadow-[0_24px_80px_-35px_rgba(25,33,31,0.25)] lg:min-h-[720px] lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative isolate flex flex-col overflow-hidden bg-[#192623] px-7 py-8 text-white sm:px-10 lg:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-36 top-24 -z-10 h-[480px] w-[480px] rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-40 -z-10 h-[350px] w-[350px] rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-32 -z-10 h-80 w-80 rounded-full bg-[#bd8461]/10 blur-3xl" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="text-lg font-semibold tracking-[.18em] text-white no-underline" aria-label="OneElixir storefront">ONEELIXIR<span className="text-[#d9a587]">.</span></Link>
            <span className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-medium tracking-[.15em] text-[#c5d2cc]">ADMIN WORKSPACE</span>
          </div>
          <div className="my-10 max-w-sm lg:my-auto lg:py-16">
            <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9a587]/30 bg-[#d9a587]/10 text-[#d9a587]"><ShieldCheck size={23} strokeWidth={1.5} /></span>
            <p className="mb-4 text-[10px] font-semibold tracking-[.23em] text-[#d9a587]">BEHIND THE BRAND</p>
            <h1 className="m-0 text-4xl leading-[1.12] tracking-[-.025em] sm:text-5xl lg:text-[56px]">Great details.<br />Smooth operations.</h1>
            <p className="mb-0 mt-6 max-w-[290px] text-sm leading-7 text-[#aebfb7]">Your space to manage the everyday, and keep OneElixir moving forward.</p>
          </div>
          <div className="hidden border-t border-white/10 pt-7 sm:block">
            <div className="grid grid-cols-3 gap-3">{[{ icon: <Package size={15} strokeWidth={1.5} />, label: 'Inventory' }, { icon: <ReceiptText size={15} strokeWidth={1.5} />, label: 'Orders' }, { icon: <ChartNoAxesCombined size={15} strokeWidth={1.5} />, label: 'Insights' }].map(({ icon, label }) => <div key={label} className="flex items-center gap-2 text-xs text-[#aebfb7]"><span className="text-[#d9a587]">{icon}</span>{label}</div>)}</div>
          </div>
        </aside>

        <section aria-labelledby="login-heading" className="flex flex-col px-6 py-8 sm:px-12 sm:py-10 lg:px-14 lg:py-12">
          <Link to="/" className="mb-10 inline-flex w-fit items-center gap-2 text-xs text-[#818784] no-underline transition hover:text-[#202427]"><ArrowLeft size={14} /> Back to storefront</Link>
          <div className="my-auto w-full py-2 lg:py-8">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e5e7e3] bg-[#f7f8f5] px-3 py-1.5 text-[10px] font-semibold tracking-[.1em] text-[#6d7b70]"><span className="h-1.5 w-1.5 rounded-full bg-[#748d77]" /> {mustChangePassword ? 'ACCOUNT SETUP' : 'STAFF ACCESS'}</div>
            <h2 id="login-heading" className="m-0 font-sans! text-[30px] font-semibold leading-tight tracking-[-1px] sm:text-[34px]">{mustChangePassword ? 'Make it yours.' : 'Welcome back.'}</h2>
            <p className="mb-8 mt-3 text-sm leading-6 text-[#858b88]">{mustChangePassword ? 'Set a new password to finish setting up your admin account.' : 'Sign in to your OneElixir admin workspace.'}</p>

            <form onSubmit={mustChangePassword ? handleChangePassword : handleLogin} aria-busy={busy} className="space-y-5">
              {!mustChangePassword ? <>
                <div>
                  <label htmlFor="admin-email" className="mb-2 block text-xs font-semibold text-[#474f4b]">Email address</label>
                  <div className="relative"><Mail aria-hidden="true" size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#929a95]" /><input id="admin-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="you@oneelixir.com" required disabled={busy} value={email} onChange={event => setEmail(event.target.value)} className={inputClass} /></div>
                </div>
                <div>
                  <label htmlFor="admin-password" className="mb-2 block text-xs font-semibold text-[#474f4b]">Password</label>
                  <div className="relative"><LockKeyhole aria-hidden="true" size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#929a95]" /><input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required disabled={busy} value={password} onChange={event => setPassword(event.target.value)} onKeyUp={checkCapsLock} onKeyDown={checkCapsLock} onBlur={() => setCapsLock(false)} className={inputClass} /><button type="button" disabled={busy} onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[#929a95] hover:text-[#202427]">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                  {capsLock && <p role="status" className="mb-0 mt-2 text-xs text-amber-700">Caps Lock is on.</p>}
                </div>
              </> : <>
                <div>
                  <label htmlFor="admin-new-password" className="mb-2 block text-xs font-semibold text-[#474f4b]">New password</label>
                  <div className="relative"><LockKeyhole aria-hidden="true" size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#929a95]" /><input id="admin-new-password" name="new-password" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a new password" required minLength={6} disabled={busy} value={newPass} onChange={event => setNewPass(event.target.value)} aria-describedby="password-help" className={inputClass} /><button type="button" disabled={busy} onClick={() => setShowNewPassword(value => !value)} aria-label={showNewPassword ? 'Hide new passwords' : 'Show new passwords'} aria-pressed={showNewPassword} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[#929a95] hover:text-[#202427]">{showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                  <p id="password-help" className="mb-0 mt-2 text-xs text-[#858b88]">At least 6 characters, different from your current password.</p>
                </div>
                <div>
                  <label htmlFor="admin-confirm-password" className="mb-2 block text-xs font-semibold text-[#474f4b]">Confirm password</label>
                  <div className="relative"><LockKeyhole aria-hidden="true" size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#929a95]" /><input id="admin-confirm-password" name="confirm-password" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter your new password" required minLength={6} disabled={busy} value={confirmPass} onChange={event => setConfirmPass(event.target.value)} aria-invalid={Boolean(confirmPass && newPass !== confirmPass)} aria-describedby={confirmPass && newPass !== confirmPass ? 'password-mismatch' : undefined} className={inputClass} /></div>
                  {confirmPass && newPass !== confirmPass && <p id="password-mismatch" role="status" className="mb-0 mt-2 text-xs text-red-600">Passwords do not match.</p>}
                </div>
              </>}
              <button type="submit" disabled={busy || (mustChangePassword && (!newPass || !confirmPass || newPass !== confirmPass))} className="mt-2 flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#202f29] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#30463a] disabled:cursor-not-allowed disabled:opacity-60">{busy ? <LoaderCircle size={17} className="animate-spin" /> : null}{mustChangePassword ? changingPass ? 'Updating password?' : 'Set password & continue' : loading ? 'Signing in?' : 'Sign in to workspace'}{!busy && <ArrowRight size={17} />}</button>
            </form>
            <p className="mb-0 mt-6 text-center text-xs leading-6 text-[#858b88]">{mustChangePassword ? 'Your new password will be used for future sign-ins.' : 'Need access? Contact your superadmin.'}</p>
          </div>
          <div className="mt-10 flex items-center justify-between gap-3 border-t border-[#eeefeb] pt-5 text-[10px] text-[#969d98]"><span>OneElixir administration</span><span className="flex items-center gap-1.5"><LockKeyhole size={12} /> Authorized staff only</span></div>
        </section>
      </div>
    </main>
  );
};

export default AdminLogin;
