import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { AccountSkeleton } from '../components/Skeleton';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { MapPin, Plus, Trash2, Star, Home, Briefcase, Map, Camera, Eye, EyeOff, User, ShoppingBag } from 'lucide-react';

const LABEL_ICONS = { Home: <Home size={13}/>, Work: <Briefcase size={13}/>, Other: <Map size={13}/> };
const CLOUD_NAME = 'dluvmed0b';

const Account = () => {
  const toast = useToast();
  const { user, updateUser } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const avatarInputRef = useRef(null);

  // ── Address Book State ──
  const [addresses, setAddresses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: 'Home', fullName: '', phone: '', address: '', city: '', isDefault: false
  });

  // ── Profile Edit State ──
  const [profileForm, setProfileForm] = useState({ name: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const userId = user?._id || localStorage.getItem('userId');

  useEffect(() => {
    if (user) setProfileForm(f => ({ ...f, name: user.name || '' }));
  }, [user]);

  const fetchOrderHistory = async () => {
    if (!user?.email) return;
    try {
      const res = await axios.get(`${API_URL}/api/orders/customer/${user.email.toLowerCase()}`);
      setOrders(res.data);
    } catch (err) {
      console.error('Fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  // Resolve userId — use from context/localStorage, or fetch from /me as fallback
  const resolveUserId = async () => {
    if (userId) return userId;
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return null;
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const id = res.data._id;
      localStorage.setItem('userId', id);
      updateUser({ _id: id, avatar: res.data.avatar });
      return id;
    } catch (err) {
      console.error('Could not resolve userId', err);
      return null;
    }
  };

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;
      const res = await axios.get(`${API_URL}/api/addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddresses(res.data);
    } catch (err) { console.error('Address fetch failed', err); }
  };

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => { if (!user) navigate('/signin'); }, 2000);
      return () => clearTimeout(timer);
    }
    fetchOrderHistory();
    fetchAddresses();
  }, [user, navigate]);

  // ── AVATAR UPLOAD ──
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('upload_preset', 'one_elixir_uploads');
      data.append('cloud_name', CLOUD_NAME);
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data);
      const avatarUrl = res.data.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_200,h_200,c_fill,g_face/');

      // Save to backend
      const token = localStorage.getItem('userToken');
      await axios.put(`${API_URL}/api/auth/profile`, { avatar: avatarUrl }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updateUser({ avatar: avatarUrl });
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error('Avatar upload failed.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── PROFILE SAVE ──
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      return toast.error('New passwords do not match.');
    }
    if (profileForm.newPassword && profileForm.newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters.');
    }
    setProfileSaving(true);
    try {
      const token = localStorage.getItem('userToken');
      const payload = { name: profileForm.name };
      if (profileForm.newPassword) {
        payload.currentPassword = profileForm.currentPassword;
        payload.newPassword = profileForm.newPassword;
      }
      const res = await axios.put(`${API_URL}/api/auth/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updateUser({ name: res.data.user.name });
      setProfileForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── ADDRESS HANDLERS ──
  const handleCancel = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await axios.put(`${API_URL}/api/orders/${orderId}/cancel`);
      fetchOrderHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed.');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('userToken');
    if (!token) return toast.error('Please sign in again.');
    try {
      const res = await axios.post(`${API_URL}/api/addresses`, addrForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddresses(res.data);
      setAddrForm({ label: 'Home', fullName: '', phone: '', address: '', city: '', isDefault: false });
      setShowAddForm(false);
      toast.success('Address saved successfully!');
    } catch { toast.error('Failed to save address.'); }
  };

  const handleSetDefault = async (addressId) => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await axios.put(`${API_URL}/api/addresses/${addressId}/default`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddresses(res.data);
      toast.success('Default address updated.');
    } catch { toast.error('Failed to update default address.'); }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Remove this address?')) return;
    try {
      const token = localStorage.getItem('userToken');
      const res = await axios.delete(`${API_URL}/api/addresses/${addressId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddresses(res.data);
      toast.success('Address removed.');
    } catch { toast.error('Failed to remove address.'); }
  };

  if (loading) return <AccountSkeleton />;

  const tabs = [
    { key: 'orders',  label: 'ORDER HISTORY' },
    { key: 'address', label: 'ADDRESS BOOK'  },
    { key: 'profile', label: 'EDIT PROFILE'  },
  ];

  return (
    <div className="px-[5%] md:px-[10%] py-20 min-h-[80vh]">

      {/* Header */}
      <header className="mb-10 text-center">
        {/* Avatar */}
        <div className="relative inline-block mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#eee] bg-[#f5f5f5] flex items-center justify-center mx-auto">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-[#ccc]" />
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute bottom-0 right-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center cursor-pointer border-2 border-white hover:bg-gray-700 transition-colors"
          >
            {avatarUploading ? (
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={11} />
            )}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>
        <h1 className="tracking-[5px] text-2xl md:text-3xl font-bold">
          WELCOME, {user?.name?.toUpperCase()}
        </h1>
        <p className="text-[#888] text-xs mt-2">{user?.email}</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-[#eee] mb-10 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-[11px] font-bold tracking-[2px] border-none bg-transparent cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-b-2 border-black text-black -mb-px'
                : 'text-[#888] hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ORDER HISTORY ── */}
      {activeTab === 'orders' && (
        <section>
          {orders.length === 0 ? (
            <div className="text-center mt-16">
              <ShoppingBag size={40} className="mx-auto mb-5 text-[#ddd]" />
              <p className="tracking-[2px] text-[#888] text-xs mb-2">NO ORDERS YET</p>
              <p className="text-xs text-[#aaa] mb-8">Your order history will appear here once you make a purchase.</p>
              <Link
                to="/collection"
                className="inline-block px-10 py-4 bg-black text-white no-underline text-[11px] font-bold tracking-[3px] hover:bg-gray-800 transition-colors"
              >
                START SHOPPING
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-[#eee]">
                    {['DATE', 'ITEMS', 'TOTAL', 'STATUS', 'ACTION'].map(h => (
                      <th key={h} className="py-4 px-2.5 text-[11px] text-[#999] font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order._id} className="border-b border-[#f9f9f9]">
                      <td className="py-5 px-2.5 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="py-5 px-2.5 text-sm max-w-[200px]">
                        {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                      </td>
                      <td className="py-5 px-2.5 text-sm">{order.totalAmount} TK</td>
                      <td className="py-5 px-2.5 text-sm font-bold" style={{ color: getStatusColor(order.status) }}>
                        {order.status.toUpperCase()}
                      </td>
                      <td className="py-5 px-2.5 text-sm">
                        <div className="flex gap-2 flex-wrap">
                          <Link
                            to={`/track/${order._id}`}
                            className="bg-transparent border border-black text-black px-2.5 py-1 text-[10px] hover:bg-black hover:text-white transition-colors no-underline"
                          >TRACK</Link>
                          {order.status.toLowerCase() === 'pending' && (
                            <button
                              onClick={() => handleCancel(order._id)}
                              className="bg-transparent border border-[#e74c3c] text-[#e74c3c] px-2.5 py-1 text-[10px] cursor-pointer hover:bg-[#e74c3c] hover:text-white transition-colors"
                            >CANCEL</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── ADDRESS BOOK ── */}
      {activeTab === 'address' && (
        <section>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-sm tracking-[3px] font-bold">ADDRESS BOOK</h2>
              <p className="text-xs text-[#aaa] mt-1">Your saved delivery addresses</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[11px] font-bold tracking-wider border-none cursor-pointer hover:bg-gray-800 transition-colors"
            >
              <Plus size={13} /> ADD ADDRESS
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddAddress} className="bg-[#f9f9f9] border border-[#eee] p-6 mb-8">
              <p className="text-[10px] tracking-[3px] font-bold text-[#888] mb-5">NEW ADDRESS</p>
              <div className="flex gap-3 mb-5">
                {['Home', 'Work', 'Other'].map(lbl => (
                  <button key={lbl} type="button"
                    onClick={() => setAddrForm({ ...addrForm, label: lbl })}
                    className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold tracking-wider transition-colors ${
                      addrForm.label === lbl ? 'bg-black text-white border-black' : 'bg-white text-[#888] border-[#ddd] hover:border-black'
                    }`}
                  >
                    {LABEL_ICONS[lbl]} {lbl}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <input required placeholder="Full Name" value={addrForm.fullName}
                  onChange={e => setAddrForm({...addrForm, fullName: e.target.value})}
                  className="p-3 border border-[#ddd] text-sm outline-none" />
                <input required placeholder="Phone Number" value={addrForm.phone}
                  onChange={e => setAddrForm({...addrForm, phone: e.target.value})}
                  className="p-3 border border-[#ddd] text-sm outline-none" />
              </div>
              <textarea required placeholder="Street address, area..." value={addrForm.address}
                onChange={e => setAddrForm({...addrForm, address: e.target.value})}
                rows={2} className="w-full p-3 border border-[#ddd] text-sm outline-none resize-none mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <input required placeholder="City / District" value={addrForm.city}
                  onChange={e => setAddrForm({...addrForm, city: e.target.value})}
                  className="p-3 border border-[#ddd] text-sm outline-none" />
                <label className="flex items-center gap-2 text-xs text-[#555] cursor-pointer">
                  <input type="checkbox" checked={addrForm.isDefault}
                    onChange={e => setAddrForm({...addrForm, isDefault: e.target.checked})}
                    className="w-4 h-4" />
                  Set as default address
                </label>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="px-8 py-3 bg-black text-white text-xs font-bold tracking-wider border-none cursor-pointer hover:bg-gray-800 transition-colors">
                  SAVE ADDRESS
                </button>
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="px-8 py-3 border border-[#ddd] text-xs font-bold tracking-wider bg-transparent cursor-pointer hover:border-black transition-colors">
                  CANCEL
                </button>
              </div>
            </form>
          )}

          {addresses.length === 0 ? (
            <div className="text-center py-16">
              <MapPin size={40} className="mx-auto mb-5 text-[#ddd]" />
              <p className="tracking-[2px] text-[#888] text-xs mb-2">NO SAVED ADDRESSES</p>
              <p className="text-xs text-[#aaa] mb-8">Add your delivery addresses for faster checkout.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-block px-10 py-4 bg-black text-white border-none text-[11px] font-bold tracking-[3px] hover:bg-gray-800 transition-colors cursor-pointer"
              >
                ADD ADDRESS
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {addresses.map(addr => (
                <div key={addr._id} className={`border p-5 relative ${addr.isDefault ? 'border-black' : 'border-[#eee]'}`}>
                  {addr.isDefault && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black text-white px-2 py-0.5 text-[9px] font-bold tracking-wider">
                      <Star size={9} className="fill-white" /> DEFAULT
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[#888]">{LABEL_ICONS[addr.label] || <MapPin size={13}/>}</span>
                    <span className="text-[10px] font-bold tracking-wider">{addr.label?.toUpperCase()}</span>
                  </div>
                  <p className="text-sm font-bold mb-1">{addr.fullName}</p>
                  <p className="text-xs text-[#666] mb-0.5">{addr.phone}</p>
                  <p className="text-xs text-[#666] mb-0.5">{addr.address}</p>
                  <p className="text-xs text-[#666] mb-4">{addr.city}</p>
                  <div className="flex gap-2">
                    {!addr.isDefault && (
                      <button onClick={() => handleSetDefault(addr._id)}
                        className="text-[10px] font-bold tracking-wider border border-[#ddd] px-3 py-1.5 bg-transparent cursor-pointer hover:border-black transition-colors">
                        SET DEFAULT
                      </button>
                    )}
                    <button onClick={() => handleDeleteAddress(addr._id)}
                      className="p-1.5 text-red-400 border border-[#eee] hover:bg-red-50 hover:border-red-200 transition-colors bg-transparent cursor-pointer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── EDIT PROFILE ── */}
      {activeTab === 'profile' && (
        <section className="max-w-[520px] mx-auto">
          <h2 className="text-sm tracking-[3px] font-bold mb-2">EDIT PROFILE</h2>
          <p className="text-xs text-[#aaa] mb-8">Update your name or change your password.</p>

          <form onSubmit={handleProfileSave} className="flex flex-col gap-5">
            {/* Name */}
            <div>
              <label className="text-[10px] font-bold tracking-wider text-[#888] block mb-2">FULL NAME</label>
              <input
                type="text" required
                value={profileForm.name}
                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                className="w-full p-3 border border-[#ddd] text-sm outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Divider */}
            <div className="h-px bg-[#eee]" />

            <p className="text-[10px] font-bold tracking-wider text-[#888]">CHANGE PASSWORD <span className="font-normal text-[#bbb]">(leave blank to keep current)</span></p>

            {/* Current Password */}
            <div className="relative">
              <label className="text-[10px] font-bold tracking-wider text-[#888] block mb-2">CURRENT PASSWORD</label>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                placeholder="Enter current password"
                value={profileForm.currentPassword}
                onChange={e => setProfileForm(f => ({ ...f, currentPassword: e.target.value }))}
                className="w-full p-3 border border-[#ddd] text-sm outline-none focus:border-black transition-colors"
              />
              <button type="button" onClick={() => setShowPasswords(s => ({ ...s, current: !s.current }))}
                className="absolute right-3 top-[34px] text-[#aaa] bg-transparent border-none cursor-pointer">
                {showPasswords.current ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>

            {/* New Password */}
            <div className="relative">
              <label className="text-[10px] font-bold tracking-wider text-[#888] block mb-2">NEW PASSWORD</label>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                placeholder="Enter new password"
                value={profileForm.newPassword}
                onChange={e => setProfileForm(f => ({ ...f, newPassword: e.target.value }))}
                className="w-full p-3 border border-[#ddd] text-sm outline-none focus:border-black transition-colors"
              />
              <button type="button" onClick={() => setShowPasswords(s => ({ ...s, new: !s.new }))}
                className="absolute right-3 top-[34px] text-[#aaa] bg-transparent border-none cursor-pointer">
                {showPasswords.new ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>

            {/* Confirm New Password */}
            <div className="relative">
              <label className="text-[10px] font-bold tracking-wider text-[#888] block mb-2">CONFIRM NEW PASSWORD</label>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={profileForm.confirmPassword}
                onChange={e => setProfileForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full p-3 border border-[#ddd] text-sm outline-none focus:border-black transition-colors"
              />
              <button type="button" onClick={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))}
                className="absolute right-3 top-[34px] text-[#aaa] bg-transparent border-none cursor-pointer">
                {showPasswords.confirm ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
              {profileForm.confirmPassword && profileForm.newPassword !== profileForm.confirmPassword && (
                <p className="text-[10px] text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="py-4 bg-black text-white text-xs font-bold tracking-[3px] hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer border-none mt-2"
            >
              {profileSaving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </form>
        </section>
      )}
    </div>
  );
};

const getStatusColor = (status) => {
  const s = status?.toLowerCase();
  if (s === 'delivered') return '#27ae60';
  if (s === 'shipped')   return '#f39c12';
  if (s === 'cancelled') return '#e74c3c';
  return '#888';
};

export default Account;