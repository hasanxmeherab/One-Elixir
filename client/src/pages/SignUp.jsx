import { useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useWishlist } from '../context/WishlistContext';
import { usePageMeta } from '../hooks/usePageMeta';
import CustomerAuthLayout, { AuthField, AuthPassword, AuthSubmit, AuthGoogle } from '../components/CustomerAuthLayout';

const SignUp = () => {
  usePageMeta('Create Account | OneElixir', 'Create your OneElixir account to save favourite fragrances, manage your orders, and check out with saved addresses.');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const { login } = useUser();
  const { reloadWishlist } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const from = location.state?.from || '/';
  const matches = form.password === form.confirmPassword;
  const update = key => event => setForm(previous => ({ ...previous, [key]: event.target.value }));
  const handleSubmit = async event => {
    event.preventDefault();
    if (busy.current) return;
    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    if (form.password.length < 6) { setError('Choose a password with at least 6 characters.'); return; }
    if (!matches) { setError('Your passwords do not match.'); return; }
    busy.current = true; setLoading(true); setError('');
    try {
      const email = form.email.trim().toLowerCase();
      await axios.post(`${API_URL}/api/auth/signup`, { name: form.name.trim(), email, password: form.password });
      navigate('/signin', { replace: true, state: { from, email, accountCreated: true } });
    } catch (err) { setError(err.response?.data?.message || 'We could not create your account. Please try again.'); }
    finally { busy.current = false; setLoading(false); }
  };
  const handleGoogleSuccess = async credentialResponse => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try {
      const response = await axios.post(`${API_URL}/api/auth/google`, { credential: credentialResponse.credential });
      login(response.data); reloadWishlist(); navigate(from, { replace: true });
    } catch { setError('Google sign-up could not be completed. Please try again.'); }
    finally { busy.current = false; setLoading(false); }
  };
  return <CustomerAuthLayout mode="signup">
    {error && <p role="alert" className="mb-5 rounded-xl border border-[#edcfc6] bg-[#fff5f1] px-4 py-3 text-xs leading-6 text-[#a3543f]">{error}</p>}
    <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-2.5 sm:space-y-3">
      <AuthField id="signup-name" name="name" label="Full name" type="text" required maxLength={100} autoComplete="name" placeholder="Your name" disabled={loading} value={form.name} onChange={update('name')} />
      <AuthField id="signup-email" name="email" label="Email address" type="email" required maxLength={200} autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" disabled={loading} value={form.email} onChange={update('email')} />
      <div><AuthPassword id="signup-password" name="password" label="Password (at least 6 characters)" required minLength={6} maxLength={128} autoComplete="new-password" placeholder="Create a password" disabled={loading} visible={showPassword} onToggle={() => setShowPassword(value => !value)} value={form.password} onChange={update('password')} /></div>
      <div><AuthPassword id="signup-confirm" name="confirmPassword" label="Confirm password" required minLength={6} maxLength={128} autoComplete="new-password" placeholder="Enter your password again" disabled={loading} visible={showPassword} onToggle={() => setShowPassword(value => !value)} value={form.confirmPassword} onChange={update('confirmPassword')} aria-invalid={Boolean(form.confirmPassword && !matches)} aria-describedby={form.confirmPassword && !matches ? 'signup-password-match' : undefined} />{form.confirmPassword && !matches && <p id="signup-password-match" role="status" className={`mb-0 mt-2 flex items-center gap-1.5 text-[10px] ${matches ? 'text-[#7d8f66]' : 'text-[#bd6d57]'}`}><X size={12} />Passwords do not match yet</p>}</div>
      <div className="pt-1"><AuthSubmit loading={loading} disabled={Boolean(form.confirmPassword && !matches)}>{loading ? 'Creating your account...' : 'Create account'}</AuthSubmit></div>
    </form>
    <AuthGoogle signup disabled={loading} onSuccess={handleGoogleSuccess} onError={() => setError('Google sign-up could not be completed. Please try again.')} />
    <p className="mb-0 mt-3 text-center text-xs leading-5 text-[#a29589]">Already part of OneElixir? <Link to="/signin" state={{ from }} className="font-semibold text-[#78543f] underline underline-offset-4">Sign in</Link></p>
  </CustomerAuthLayout>;
};
export default SignUp;
