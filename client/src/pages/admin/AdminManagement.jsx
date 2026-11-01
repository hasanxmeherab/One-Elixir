import { useState, useEffect } from 'react';
import { Plus, KeyRound, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import adminAxios from '../../utils/adminAxios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { PageHeading, Stats, Empty, ErrorNotice, Modal } from '../../components/admin/AdminUi';
import { panel, field, button, primary } from '../../utils/adminPresentation';
export default function AdminManagement() {
  const toast = useToast();
  const navigate = useNavigate();
  const me = JSON.parse(localStorage.getItem('adminData') || '{}');
  const superadmin = me.role === 'superadmin';
  const myId = me.id || me._id;
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(superadmin);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [pass, setPass] = useState({ current: '', next: '', confirm: '' });
  const load = async () => {
    setLoading(true); setError('');
    try { setAdmins((await adminAxios.get('/api/admins/list')).data); }
    catch (err) { setError(err.response?.data?.message || 'Could not load staff accounts.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (superadmin) load(); }, [superadmin]);
  const create = async e => {
    e.preventDefault(); if (saving) return; setSaving(true);
    try { await adminAxios.post('/api/admins/register', { ...form, name: form.name.trim(), email: form.email.trim() }); toast.success('Admin created. They will set a new password on first sign-in.'); setShowCreate(false); setForm({ name: '', email: '', password: '' }); await load(); }
    catch (err) { toast.error(err.response?.data?.errors?.join(', ') || err.response?.data?.message || 'Could not create admin.'); }
    finally { setSaving(false); }
  };
  const changePassword = async e => {
    e.preventDefault(); if (saving) return;
    if (pass.next !== pass.confirm) return toast.warning('Passwords do not match.');
    if (pass.current === pass.next) return toast.warning('Choose a different password.');
    setSaving(true);
    try {
      await adminAxios.post('/api/admins/change-password', { currentPassword: pass.current, newPassword: pass.next });
      ['adminToken', 'adminRefreshToken', 'adminData', 'adminRole', 'isAdminAuthenticated'].forEach(key => localStorage.removeItem(key));
      toast.success('Password changed. Sign in again with your new password.');
      navigate('/admin-login', { replace: true });
    }
    catch (err) { toast.error(err.response?.data?.message || 'Could not change password.'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true);
    try { await adminAxios.delete(`/api/admins/${removing._id}`); toast.success('Admin removed.'); setRemoving(null); await load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not remove admin.'); }
    finally { setSaving(false); }
  };
  const filtered = admins.filter(a => `${a.name} ${a.email} ${a.role}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="mx-auto max-w-[1300px] pb-12"><PageHeading eyebrow="WORKSPACE / ACCESS" title={superadmin ? 'The people behind the work.' : 'Your admin account.'} description={superadmin ? 'Manage staff accounts and keep access responsibilities clear.' : 'View your account details and update your password.'}><button className={button} onClick={() => { setVisible(false); setShowPassword(true); }}><KeyRound size={14} />Change my password</button>{superadmin && <><button className={button} disabled={loading} onClick={load}><RefreshCw size={14} />Refresh</button><button className={primary} onClick={() => { setVisible(false); setShowCreate(true); }}><Plus size={14} />Add admin</button></>}</PageHeading>
    <div className={`${panel} mb-6 flex flex-wrap items-center justify-between gap-4`}><div><p className="m-0 text-[10px] tracking-wider text-[#999]">SIGNED IN AS</p><strong className="mt-2 block text-lg">{me.name}</strong><p className="mb-0 mt-1 text-xs text-[#888]">{me.email}</p></div><span className="rounded-full bg-[#f1f2ed] px-3 py-1.5 text-xs text-[#617056]">{superadmin ? 'Superadmin' : 'Admin'}</span></div>
    {superadmin ? <><ErrorNotice message={error} onRetry={load} /><Stats items={[{ label: 'Staff accounts', value: loading || error ? '—' : admins.length }, { label: 'Superadmins', value: loading || error ? '—' : admins.filter(a => a.role === 'superadmin').length, note: 'Staff access and settlement approvals' }, { label: 'Password setup pending', value: loading || error ? '—' : admins.filter(a => a.mustChangePassword).length, note: 'New password required on sign-in' }]} /><div className={panel}><input aria-label="Search staff" className={`${field} mb-5 max-w-sm`} placeholder="Search name, email, or role…" value={search} onChange={e => setSearch(e.target.value)} />{loading ? <p role="status" className="py-10 text-center text-sm text-[#888]">Loading staff…</p> : error ? null : !filtered.length ? <Empty>No staff match your search.</Empty> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-[#eee] text-[10px] tracking-wider text-[#999]"><tr>{['STAFF', 'ROLE', 'PASSWORD SETUP', 'CREATED', 'ACTION'].map(h => <th className="px-3 py-3" key={h}>{h}</th>)}</tr></thead><tbody>{filtered.map(a => <tr key={a._id} className="border-b border-[#eee] last:border-0"><td className="px-3 py-4"><strong className="font-medium">{a.name} {a._id === myId && <small className="text-[#999]">(you)</small>}</strong><span className="mt-1 block text-xs text-[#888]">{a.email}</span></td><td className="px-3 py-4 capitalize">{a.role}</td><td className="px-3 py-4 text-xs text-[#888]">{a.mustChangePassword ? 'Pending first sign-in setup' : 'Complete'}</td><td className="px-3 py-4 text-xs text-[#888]">{a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }) : '—'}</td><td className="px-3 py-4">{a._id !== myId ? <button className={`${button} text-red-600!`} onClick={() => setRemoving(a)}><Trash2 size={13} />Remove</button> : <span className="text-xs text-[#aaa]">Current account</span>}</td></tr>)}</tbody></table></div>}</div></> : <div className={panel}><h2 className="font-sans! text-base font-semibold">Your role</h2><p className="mb-0 text-sm leading-7 text-[#888]">Use the operations tools available in your navigation and manage your personal settlements. Contact a superadmin for staff access changes.</p></div>}
    <Modal open={showCreate} title="Add staff admin" busy={saving} onClose={() => setShowCreate(false)}><form onSubmit={create} className="space-y-4">{[{ key: 'name', label: 'Full name', type: 'text' }, { key: 'email', label: 'Email address', type: 'email' }, { key: 'password', label: 'Temporary password', type: visible ? 'text' : 'password' }].map(item => <label key={item.key} className="block text-xs font-medium">{item.label}<input required minLength={item.key === 'password' ? 6 : 1} autoComplete={item.key === 'password' ? 'new-password' : 'off'} type={item.type} value={form[item.key]} onChange={e => setForm({ ...form, [item.key]: e.target.value })} className={`${field} mt-2`} /></label>)}<button type="button" className={button} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={14} /> : <Eye size={14} />}{visible ? 'Hide' : 'Show'} password</button><p className="text-xs leading-6 text-[#888]">Creates a regular admin account. A new password is required on their first sign-in.</p><button className={`${primary} w-full`} disabled={saving}>{saving ? 'Creating…' : 'Create admin'}</button></form></Modal>
    <Modal open={showPassword} title="Change your password" busy={saving} onClose={() => { setShowPassword(false); setPass({ current: '', next: '', confirm: '' }); }}><form onSubmit={changePassword} className="space-y-4">{[{ key: 'current', label: 'Current password' }, { key: 'next', label: 'New password (at least 6 characters)' }, { key: 'confirm', label: 'Confirm new password' }].map(item => <label className="block text-xs font-medium" key={item.key}>{item.label}<input required minLength={item.key === 'current' ? 1 : 6} type={visible ? 'text' : 'password'} autoComplete={item.key === 'current' ? 'current-password' : 'new-password'} value={pass[item.key]} onChange={e => setPass({ ...pass, [item.key]: e.target.value })} className={`${field} mt-2`} /></label>)}<button type="button" className={button} onClick={() => setVisible(v => !v)}>{visible ? 'Hide passwords' : 'Show passwords'}</button>{pass.confirm && pass.confirm !== pass.next && <p role="status" className="text-xs text-red-600">Passwords do not match.</p>}<button disabled={saving} className={`${primary} w-full`}>{saving ? 'Updating…' : 'Update password'}</button></form></Modal>
    <Modal open={!!removing} title="Remove staff account?" busy={saving} onClose={() => setRemoving(null)}><p className="text-sm leading-6 text-[#777]">Remove {removing?.name} ({removing?.email})? Their account will be deleted. Existing activity and financial records remain for reference.</p><button className={`${button} text-red-600!`} disabled={saving} onClick={remove}>{saving ? 'Removing…' : 'Remove account'}</button></Modal>
  </section>;
}
