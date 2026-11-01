import { useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useWishlist } from '../context/WishlistContext';
import { usePageMeta } from '../hooks/usePageMeta';
import CustomerAuthLayout, { AuthField, AuthPassword, AuthSubmit, AuthGoogle } from '../components/CustomerAuthLayout';

const SignIn = () => {
  usePageMeta('Sign In | OneElixir', 'Sign in to your OneElixir account to track orders and manage your saved perfumes.');
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const { login } = useUser();
  const { reloadWishlist } = useWishlist();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const from = location.state?.from || '/';
  const finishLogin = data => {
    login(data);
    reloadWishlist();
    navigate(from, { replace: true });
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try {
      const response = await axios.post(`${API_URL}/api/auth/signin`, { email: email.trim().toLowerCase(), password });
      finishLogin(response.data);
    } catch (err) {
      setError([400, 401].includes(err.response?.status) ? 'The email or password is incorrect. Please check and try again.' : 'We could not sign you in. Please try again in a moment.');
    } finally { busy.current = false; setLoading(false); }
  };
  const handleGoogleSuccess = async credentialResponse => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try {
      const response = await axios.post(`${API_URL}/api/auth/google`, { credential: credentialResponse.credential });
      finishLogin(response.data);
    } catch { setError('Google sign-in could not be completed. Please try again.'); }
    finally { busy.current = false; setLoading(false); }
  };
  return <CustomerAuthLayout mode="signin">
    {location.state?.accountCreated && <p role="status" className="mb-5 rounded-xl border border-[#d9e4cf] bg-[#f5f8f1] px-4 py-3 text-xs leading-6 text-[#61774d]">Your account is ready. Sign in to continue.</p>}
    {error && <p role="alert" className="mb-5 rounded-xl border border-[#edcfc6] bg-[#fff5f1] px-4 py-3 text-xs leading-6 text-[#a3543f]">{error}</p>}
    <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-2.5 sm:space-y-3">
      <AuthField id="signin-email" name="email" label="Email address" type="email" required maxLength={200} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" disabled={loading} value={email} onChange={event => setEmail(event.target.value)} />
      <div><AuthPassword id="signin-password" name="password" label="Password" required autoComplete="current-password" placeholder="Enter your password" visible={showPassword} onToggle={() => setShowPassword(value => !value)} disabled={loading} value={password} onChange={event => setPassword(event.target.value)} /><div className="mt-2 text-right"><Link to="/forgot-password" className="text-xs text-[#a47760] underline-offset-4 hover:underline">Forgot password?</Link></div></div>
      <AuthSubmit loading={loading}>{loading ? 'Signing you in...' : 'Sign in'}</AuthSubmit>
    </form>
    <AuthGoogle disabled={loading} onSuccess={handleGoogleSuccess} onError={() => setError('Google sign-in could not be completed. Please try again.')} />
    <p className="mb-0 mt-3 text-center text-xs leading-5 text-[#a29589]">New to OneElixir? <Link to="/signup" state={{ from }} className="font-semibold text-[#78543f] underline underline-offset-4">Create an account</Link></p>
    {from === '/checkout' && <p className="mb-0 mt-3 text-center text-[10px] text-[#b09b87]">You will return to checkout after signing in.</p>}
  </CustomerAuthLayout>;
};
export default SignIn;
