import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, ShieldCheck, Trash2, BadgeCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AdminManagement = () => {
  const toast = useToast();
  const [admins, setAdmins] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const adminRole  = localStorage.getItem('adminRole')  || 'admin';
  const adminToken = localStorage.getItem('adminToken') || '';
  const adminData  = JSON.parse(localStorage.getItem('adminData') || '{}');
  const loggedInId = adminData?.id || adminData?._id || '';

  const isSuperadmin = adminRole === 'superadmin';

  const fetchAdmins = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admins/list`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setAdmins(res.data);
    } catch (err) { console.error('Could not fetch admins'); }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const deleteAdmin = async (id) => {
    if (!isSuperadmin) return toast.error('Only superadmins can remove admins.');
    if (id === loggedInId) return toast.warning('You cannot delete your own account.');
    if (!window.confirm("Revoke this admin's access?")) return;
    try {
      await axios.delete(`${API_URL}/api/admins/${id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete admin.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admins/register`, formData, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      toast.success('New admin created successfully.');
      setFormData({ name: '', email: '', password: '' });
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin. Email might already exist.');
    }
  };

  return (
    <div className="p-5">
      {/* Header */}
      <div className="mb-8 border-b border-[#eee] pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="tracking-[3px] font-bold">ADMINISTRATOR MANAGEMENT</h2>
          <p className="text-xs text-[#666] mt-1">Manage access and roles for OneElixir staff.</p>
        </div>
        {/* Logged-in badge */}
        <div className="flex items-center gap-2 bg-black text-white px-4 py-2 text-[10px] font-bold tracking-wider">
          <BadgeCheck size={13} />
          {adminData?.name?.toUpperCase()} — {adminRole.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">

        {/* Create Admin Form — superadmin only */}
        {isSuperadmin ? (
          <div className="bg-white p-6 border border-[#eee] rounded">
            <h3 className="text-sm tracking-wider mb-5 flex items-center gap-2.5">
              <UserPlus size={18} /> CREATE NEW ADMIN
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text" placeholder="Full Name" required
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="p-3 border border-[#ddd] text-sm outline-none"
              />
              <input
                type="email" placeholder="Email Address" required
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                className="p-3 border border-[#ddd] text-sm outline-none"
              />
              <input
                type="password" placeholder="Password" required
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                className="p-3 border border-[#ddd] text-sm outline-none"
              />
              <button
                type="submit"
                className="p-3 bg-black text-white border-none cursor-pointer font-bold tracking-wider hover:bg-gray-800 transition-colors"
              >
                AUTHORIZE ADMIN
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-[#f9f9f9] border border-[#eee] rounded p-6 flex flex-col items-center justify-center text-center gap-3">
            <ShieldCheck size={32} className="text-[#ccc]" />
            <p className="text-xs font-bold tracking-wider text-[#888]">SUPERADMIN ONLY</p>
            <p className="text-[11px] text-[#aaa]">Only a superadmin can create or remove admin accounts.</p>
          </div>
        )}

        {/* Admin Table */}
        <div className="bg-white border border-[#eee] rounded overflow-hidden overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9f9f9] text-left">
                {['NAME', 'CONTACT', 'ROLE', 'JOINED', 'ACTION'].map(h => (
                  <th key={h} className="py-4 px-4 text-[11px] tracking-wider text-[#888]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => {
                const isMe = admin._id === loggedInId;
                return (
                  <tr key={admin._id} className={`border-b border-[#f0f0f0] ${isMe ? 'bg-yellow-50' : ''}`}>
                    <td className="py-4 px-4 text-sm font-bold">
                      <div className="flex items-center gap-2">
                        {admin.name}
                        {isMe && (
                          <span className="text-[9px] bg-black text-white px-2 py-0.5 tracking-wider font-bold rounded-full">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm">{admin.email}</td>
                    <td className="py-4 px-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        admin.role === 'superadmin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-[#e6fffa] text-[#2c7a7b]'
                      }`}>
                        <ShieldCheck size={12} /> {admin.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm">{new Date(admin.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-sm">
                      {isSuperadmin && !isMe ? (
                        <button
                          onClick={() => deleteAdmin(admin._id)}
                          className="border-none bg-transparent text-red-500 cursor-pointer hover:opacity-70 transition-opacity"
                          title="Revoke Access"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <span className="text-[#ddd]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;