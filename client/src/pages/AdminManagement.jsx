import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, ShieldCheck, Trash2 } from 'lucide-react';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchAdmins = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admins/list`);
      setAdmins(res.data);
    } catch (err) { console.error("Could not fetch admins"); }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const deleteAdmin = async (id) => {
    if (window.confirm("Are you sure you want to revoke this admin's access?")) {
      try {
        await axios.delete(`${API_URL}/api/admins/${id}`);
        alert("Admin access revoked");
        fetchAdmins();
      } catch (err) { alert("Failed to delete admin"); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admins/register`, formData);
      alert("New Admin Created Successfully");
      setFormData({ name: '', email: '', password: '' });
      fetchAdmins();
    } catch (err) { alert("Failed to create admin. Email might already exist."); }
  };

  return (
    <div className="p-5">
      {/* Header */}
      <div className="mb-8 border-b border-[#eee] pb-4">
        <h2 className="tracking-[3px] font-bold">ADMINISTRATOR MANAGEMENT</h2>
        <p className="text-xs text-[#666] mt-1">Manage access and roles for OneElixir staff.</p>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">

        {/* Create Admin Form */}
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
              {admins.map(admin => (
                <tr key={admin._id} className="border-b border-[#f0f0f0]">
                  <td className="py-4 px-4 text-sm font-bold">{admin.name}</td>
                  <td className="py-4 px-4 text-sm">{admin.email}</td>
                  <td className="py-4 px-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 bg-[#e6fffa] text-[#2c7a7b] px-2.5 py-1 rounded-full text-[10px] font-bold">
                      <ShieldCheck size={12} /> {admin.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm">{new Date(admin.createdAt).toLocaleDateString()}</td>
                  <td className="py-4 px-4 text-sm">
                    <button
                      onClick={() => deleteAdmin(admin._id)}
                      className="border-none bg-transparent text-red-500 cursor-pointer hover:opacity-70 transition-opacity"
                      title="Revoke Access"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;