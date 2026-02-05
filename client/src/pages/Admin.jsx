import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';

const Admin = () => {
  const navigate = useNavigate();
  
  // --- States ---
  const [perfumes, setPerfumes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '', price: '', description: '', scentProfile: '', image: '', stock: 0
  });

  const [orderData, setOrderData] = useState({ customerName: '', phone: '', address: '' });
  const [selectedItems, setSelectedItems] = useState([{ perfumeId: '', quantity: 1 }]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const CLOUD_NAME = "dluvmed0b";
  const UPLOAD_PRESET = "one_elixir_uploads";

  // --- Calculations ---
  const totalProducts = perfumes.length;
  const totalStockUnits = perfumes.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const totalInventoryValue = perfumes.reduce((acc, p) => acc + (p.price * (Number(p.stock) || 0)), 0);

  const calculateGrandTotal = () => {
    return selectedItems.reduce((sum, item) => {
      const perfume = perfumes.find(p => p._id === item.perfumeId);
      return sum + (perfume ? perfume.price * item.quantity : 0);
    }, 0);
  };

  const filteredOrders = orders.filter(order => 
    order.phone.includes(searchTerm) || 
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchData = async () => {
    try {
      const pRes = await axios.get(`${API_URL}/api/perfumes`);
      setPerfumes(pRes.data);
      const oRes = await axios.get(`${API_URL}/api/orders`);
      setOrders(oRes.data);
    } catch (err) { console.error("Fetch failed", err); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- Auth & Inventory Logic ---
  const handleEditClick = (p) => {
    setEditId(p._id);
    setFormData({
      name: p.name, price: p.price, description: p.description,
      scentProfile: p.scentProfile.join(', '), image: p.image, stock: p.stock
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setFormData({ name: '', price: '', description: '', scentProfile: '', image: '', stock: 0 });
    setFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      let finalImageUrl = formData.image;
      if (file) {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", UPLOAD_PRESET);
        data.append("cloud_name", CLOUD_NAME);
        const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data);
        finalImageUrl = res.data.secure_url;
      }
      const payload = { ...formData, image: finalImageUrl, scentProfile: formData.scentProfile.split(',').map(s => s.trim()) };
      if (editId) { await axios.put(`${API_URL}/api/perfumes/${editId}`, payload); }
      else { await axios.post(`${API_URL}/api/perfumes`, payload); }
      cancelEdit(); fetchData();
    } catch (err) { alert('Operation failed'); } finally { setUploading(false); }
  };

  const deletePerfume = async (id) => {
    if (window.confirm("Remove item from inventory?")) {
      await axios.delete(`${API_URL}/api/perfumes/${id}`);
      fetchData();
    }
  };

  // --- Order Handlers ---
  const addMoreItems = () => setSelectedItems([...selectedItems, { perfumeId: '', quantity: 1 }]);
  
  const updateItemRow = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    setSelectedItems(updated);
  };

  const removeItemRow = (index) => {
    if (selectedItems.length > 1) setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    const total = calculateGrandTotal();
    const itemsToOrder = [];

    for (const item of selectedItems) {
      const perfume = perfumes.find(p => p._id === item.perfumeId);
      if (!perfume || perfume.stock < item.quantity) {
        alert(`Insufficient stock for ${perfume?.name || 'selected item'}`);
        return;
      }
      itemsToOrder.push({ perfumeId: perfume._id, name: perfume.name, price: perfume.price, quantity: item.quantity });
    }

    try {
      await axios.post(`${API_URL}/api/orders`, { ...orderData, items: itemsToOrder, totalAmount: total });
      for (const item of itemsToOrder) {
        const perfume = perfumes.find(p => p._id === item.perfumeId);
        await axios.put(`${API_URL}/api/perfumes/${item.perfumeId}`, { stock: perfume.stock - item.quantity });
      }
      setOrderData({ customerName: '', phone: '', address: '' });
      setSelectedItems([{ perfumeId: '', quantity: 1 }]);
      fetchData();
      alert("Order Created!");
    } catch (err) { alert("Order failed"); }
  };

  const updateOrderStatus = async (id, status) => {
    await axios.put(`${API_URL}/api/orders/${id}`, { status });
    fetchData();
  };

  const deleteOrder = async (order) => {
    if (window.confirm("Delete Order?")) {
      try {
        for (const item of order.items) {
          const perfume = perfumes.find(p => p._id === item.perfumeId);
          if (perfume) {
            await axios.put(`${API_URL}/api/perfumes/${item.perfumeId}`, { 
              stock: perfume.stock + item.quantity 
            });
          }
        }
        await axios.delete(`${API_URL}/api/orders/${order._id}`);
        fetchData();
        alert("Order deleted!");
      } catch (err) { alert("Delete failed"); }
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      {/* Dedicate Admin Navbar for strict isolation */}
      <AdminNavbar />

      <div style={{ padding: '50px 10%', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ letterSpacing: '4px', textAlign: 'center', marginBottom: '40px', fontWeight: '900' }}>COMMAND CENTER</h2>

        {/* --- Stats Display --- */}
        <div style={statsContainer}>
          <div style={statBox}>
            <span style={statLabel}>COLLECTION SIZE</span>
            <span style={statValue}>{totalProducts} Scents</span>
          </div>
          <div style={statBox}>
            <span style={statLabel}>TOTAL UNITS</span>
            <span style={statValue}>{totalStockUnits} Bottles</span>
          </div>
          <div style={statBox}>
            <span style={statLabel}>INVENTORY VALUE</span>
            <span style={statValue}>{totalInventoryValue.toLocaleString()} TK</span>
          </div>
        </div>
        
        {/* --- Inventory Management --- */}
        <section style={sectionStyle}>
          <h3 style={sectionTitle}>INVENTORY MANAGEMENT</h3>
          <form onSubmit={handleSubmit} style={formStyle}>
            <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={inputStyle}/>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="number" placeholder="Price (TK)" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required style={{...inputStyle, flex: 1}}/>
              <input type="number" placeholder="Stock" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} required style={{...inputStyle, flex: 1}}/>
            </div>
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{...inputStyle, minHeight: '80px'}}/>
            <input type="text" placeholder="Scent Notes (comma separated)" value={formData.scentProfile} onChange={e => setFormData({...formData, scentProfile: e.target.value})} style={inputStyle}/>
            <div style={{ padding: '10px', border: '1px solid #eee', marginBottom: '10px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>UPLOAD IMAGE</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} required={!editId} style={{ fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={uploading} style={btnStyle}>{uploading ? 'PROCESSING...' : editId ? 'UPDATE CHANGES' : 'UPLOAD ELIXIR'}</button>
              {editId && <button type="button" onClick={cancelEdit} style={cancelBtnStyle}>CANCEL</button>}
            </div>
          </form>

          <table style={tableStyle}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={thStyle}>NAME</th><th style={thStyle}>PRICE</th><th style={thStyle}>STOCK</th><th style={thStyle}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {perfumes.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>{p.price} TK</td>
                  <td style={{...tdStyle, color: p.stock < 5 ? 'red' : 'black', fontWeight: 'bold'}}>{p.stock}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEditClick(p)} style={actionBtn}>EDIT</button>
                    <button onClick={() => deletePerfume(p._id)} style={{...actionBtn, color: 'red'}}>DELETE</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* --- Order Management --- */}
        <section style={{ ...sectionStyle, marginTop: '100px', borderTop: '4px solid #000', paddingTop: '40px' }}>
          <h3 style={sectionTitle}>ORDER MANAGEMENT</h3>
          <form onSubmit={handleOrderSubmit} style={{ ...formStyle, backgroundColor: '#fcfcfc', padding: '30px', border: '1px solid #f0f0f0' }}>
            <p style={{ margin: '0 0 15px 0', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>CREATE MANUAL SHIPMENT</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Customer Name" value={orderData.customerName} onChange={e => setOrderData({...orderData, customerName: e.target.value})} required style={{...inputStyle, flex: 1}}/>
              <input type="text" placeholder="Phone" value={orderData.phone} onChange={e => setOrderData({...orderData, phone: e.target.value})} required style={{...inputStyle, flex: 1}}/>
            </div>

            {selectedItems.map((item, index) => {
              const currentPerfume = perfumes.find(p => p._id === item.perfumeId);
              const lineTotal = currentPerfume ? currentPerfume.price * item.quantity : 0;
              return (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                  <select value={item.perfumeId} onChange={e => updateItemRow(index, 'perfumeId', e.target.value)} required style={{ ...inputStyle, flex: 3 }}>
                      <option value="">-- PICK PERFUME --</option>
                      {perfumes.map(p => {
                          const isAlreadySelected = selectedItems.some((sel, i) => sel.perfumeId === p._id && i !== index);
                          return !isAlreadySelected ? (
                              <option key={p._id} value={p._id} disabled={p.stock <= 0}>{p.name} ({p.price} TK)</option>
                          ) : null;
                      })}
                  </select>
                  <input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => updateItemRow(index, 'quantity', parseInt(e.target.value))} required style={{ ...inputStyle, flex: 1 }}/>
                  <div style={{ minWidth: '90px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>{lineTotal.toLocaleString()} TK</div>
                  {selectedItems.length > 1 && (<button type="button" onClick={() => removeItemRow(index)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>×</button>)}
                </div>
              );
            })}

            <button type="button" onClick={addMoreItems} style={{ ...actionBtn, display: 'block', margin: '10px 0', fontSize: '11px' }}>+ ADD ANOTHER PERFUME</button>
            <input type="text" placeholder="Shipping Address" value={orderData.address} onChange={e => setOrderData({...orderData, address: e.target.value})} style={inputStyle}/>
            
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#000', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ letterSpacing: '2px', fontSize: '11px', fontWeight: 'bold' }}>ESTIMATED TOTAL</span>
              <span style={{ fontSize: '22px', fontWeight: '900' }}>{calculateGrandTotal().toLocaleString()} TK</span>
            </div>
            <button type="submit" style={{ ...btnStyle, marginTop: '10px', backgroundColor: '#000' }}>CONFIRM ORDER</button>
          </form>

          {/* --- Order History Table --- */}
          <div style={{ marginTop: '60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h4 style={{ margin: 0, letterSpacing: '2px' }}>ORDER ARCHIVE</h4>
              <input 
                type="text" 
                placeholder="Filter by Phone..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                style={{ padding: '10px', border: '1px solid #eee', width: '280px', fontSize: '12px' }}
              />
            </div>
            <table style={tableStyle}>
              <thead>
                <tr style={{ borderBottom: '2px solid #000' }}>
                  <th style={thStyle}>CUSTOMER</th>
                  <th style={thStyle}>DETAILS</th>
                  <th style={thStyle}>TOTAL</th>
                  <th style={thStyle}>STATUS</th>
                  <th style={thStyle}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={tdStyle}>
                      <strong style={{ fontSize: '14px' }}>{order.customerName}</strong><br/>
                      <span style={{ fontSize: '11px', color: '#666' }}>{order.phone}</span><br/>
                      <span style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase' }}>{order.address}</span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: '11px' }}>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {order.items.map((item, i) => (
                          <li key={i} style={{ marginBottom: '4px', borderBottom: '1px dashed #f0f0f0' }}>
                            <span style={{ fontWeight: 'bold' }}>{item.quantity}x</span> {item.name}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>{order.totalAmount.toLocaleString()} TK</td>
                    <td style={{ ...tdStyle, color: order.status === 'Delivered' ? '#27ae60' : '#f39c12', fontWeight: 'bold', fontSize: '11px' }}>{order.status.toUpperCase()}</td>
                    <td style={tdStyle}>
                      <select onChange={(e) => updateOrderStatus(order._id, e.target.value)} style={{ padding: '6px', fontSize: '10px', display: 'block', marginBottom: '8px', border: '1px solid #eee' }}>
                        <option value="">Update</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                      <button onClick={() => deleteOrder(order)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline', fontSize: '10px' }}>ARCHIVE/DELETE</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

// --- Updated Premium Styles ---
const statsContainer = { display: 'flex', gap: '25px', marginBottom: '60px' };
const statBox = { flex: 1, padding: '30px', backgroundColor: '#fff', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '5px solid #000' };
const statLabel = { fontSize: '10px', letterSpacing: '3px', color: '#aaa', fontWeight: '900' };
const statValue = { fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px' };

const sectionStyle = { marginBottom: '50px' };
const sectionTitle = { letterSpacing: '3px', fontSize: '20px', marginBottom: '30px', fontWeight: 'bold', borderLeft: '10px solid #000', paddingLeft: '15px' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '50px' };
const inputStyle = { padding: '14px', border: '1px solid #eee', outline: 'none', fontSize: '13px', backgroundColor: '#fafafa' };
const btnStyle = { padding: '16px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', fontSize: '12px' };
const cancelBtnStyle = { ...btnStyle, background: '#fff', color: '#000', border: '1px solid #000' };

const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const thStyle = { padding: '15px 10px', fontSize: '11px', letterSpacing: '2px', color: '#888' };
const tdStyle = { padding: '20px 10px', fontSize: '13px' };
const actionBtn = { background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 'bold', marginRight: '15px', textDecoration: 'underline', fontSize: '12px' };
const headerStyle = { display: 'flex', justifyContent: 'center', marginBottom: '20px' }; // Hidden text header in favor of AdminNavbar title

export default Admin;