import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import adminAxios from '../../utils/adminAxios';
import { Link, useOutletContext } from 'react-router-dom';
import Select from 'react-select';
import locationData from '../../data/locationData.json';
import { ImagePlus, Plus, X, UserRound, ShoppingBag, Truck, CreditCard, Tag, Package } from 'lucide-react';
import { itemUnitPrice, manualOrderTotals } from '../../utils/manualOrderTotals';
import './ManualOrder.css';

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;


// Use the store's timezone for the default order date.
const getLocalDate = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const ManualOrder = () => {
  const { perfumes = [], fetchData, toast = (() => {}) } = useOutletContext();

  const today = getLocalDate();
  const [orderData, setOrderData]         = useState({ customerName: '', phone: '', address: '', orderDate: today });
  const [division, setDivision]           = useState(null);
  const [district, setDistrict]           = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [freeDelivery, setFreeDelivery]   = useState(false);
  const [uploading, setUploading]         = useState(false);

  const [onlinePayment, setOnlinePayment] = useState({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' });
  const [selectedItems, setSelectedItems] = useState([{ perfumeId: '', variantIdx: null, quantity: 1, discountType: 'none', discountValue: 0 }]);
  const [couponCode, setCouponCode]       = useState('');

  // ── Payment Receiver (required when Paid) ──
  const [adminList, setAdminList] = useState([]);
  const [selectedReceiver, setSelectedReceiver] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [totalDiscountType, setTotalDiscountType] = useState('none');
  const [totalDiscountValue, setTotalDiscountValue] = useState(0);
  const [adminError, setAdminError] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  useEffect(() => {
    if (!onlinePayment.screenshot) { setScreenshotPreview(''); return; }
    const url = URL.createObjectURL(onlinePayment.screenshot);
    setScreenshotPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [onlinePayment.screenshot]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const isOnlinePayment = ['Bkash', 'Nagad', 'Bank Transfer'].includes(paymentMethod);
  const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');

  // Fetch admin list for payment receiver selection
  useEffect(() => {
    adminAxios.get(`${API_URL}/api/admins/list`)
      .then(res => setAdminList(res.data))
      .catch(() => setAdminError(true))
      .finally(() => setAdminsLoading(false));
  }, [API_URL]);

  const shippingCost = useMemo(() => {
    if (freeDelivery) return 0;
    if (!district) return 0;
    if (district.value === 'Dhaka' || district.value === 'Ashulia (Daffodil Area)') return 0;
    return 120;
  }, [district, freeDelivery]);

  const perfumeOptions = useMemo(() => {
    if (!perfumes.length) return [];
    const options = [];
    perfumes.forEach(p => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v, idx) => {
          options.push({
            value: `${p._id}__${idx}`,
            label: `${p.name} — ${v.label} (${v.price} TK) — Stock: ${v.stock}`,
            perfumeId: p._id,
            variantIdx: idx,
            price: v.price,
            stock: v.stock,
            fullName: `${p.name} — ${v.label}`,
          });
        });
      } else {
        options.push({
          value: p._id,
          label: `${p.name} (${p.price} TK) — Stock: ${p.stock}`,
          perfumeId: p._id,
          variantIdx: null,
          price: p.price,
          stock: p.stock,
          fullName: p.name,
        });
      }
    });
    return options;
  }, [perfumes]);

  const getSelectedOption = (item) => {
    if (!item.perfumeId) return null;
    const key = item.variantIdx != null ? `${item.perfumeId}__${item.variantIdx}` : item.perfumeId;
    return perfumeOptions.find(opt => opt.value === key) || null;
  };

  const lines = selectedItems.filter(item => getSelectedOption(item)).map(item => ({ ...item, price: getSelectedOption(item).price }));
  const { productsTotal, itemDiscount, couponDiscount, totalDiscountAmount, grandTotal } = manualOrderTotals(lines, appliedCoupon, totalDiscountType, totalDiscountValue, shippingCost);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || couponLoading) return;
    setCouponLoading(true);
    try {
      const res = await adminAxios.post(`${API_URL}/api/coupons/validate`, { code: couponCode });
      setAppliedCoupon({ ...res.data, code: couponCode.trim().toUpperCase() });
      toast.success('Coupon applied.');
    } catch {
      toast.error('Invalid or expired coupon.');
      setAppliedCoupon(null);
    } finally { setCouponLoading(false); }
  };

  const uploadScreenshot = async (file) => {
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);
    const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, data);
    return res.data.secure_url;
  };

  const addMoreItems  = () => setSelectedItems([...selectedItems, { perfumeId: '', variantIdx: null, quantity: 1, discountType: 'none', discountValue: 0 }]);
  const removeItemRow = (index) => { if (selectedItems.length > 1) setSelectedItems(selectedItems.filter((_, i) => i !== index)); };
  const updateItemRow = (index, field, value) => {
    setSelectedItems(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (uploading || couponLoading) return;
    if (!orderData.customerName.trim() || !orderData.address.trim()) { toast.warning('Enter the customer name and delivery address.'); return; }
    if (!/^01\d{9}$/.test(orderData.phone)) { toast.warning('Enter an 11-digit phone number starting with 01.'); return; }
    if (!division || !district) { toast.warning('Please select Division and District.'); return; }
    if (isOnlinePayment && (!onlinePayment.senderNumber.trim() || !onlinePayment.transactionId.trim())) {
      toast.warning('Please fill sender number and transaction ID.'); return;
    }
    if (paymentStatus === 'Paid' && !adminList.some(admin => admin._id === selectedReceiver)) {
      toast.warning('Please select which admin received the payment.'); return;
    }
    const adminName = adminData.name || 'System Admin';
    const itemsToOrder = [];

    for (const item of selectedItems) {
      if (!item.perfumeId) { toast.warning('Select a fragrance for every row, or remove the empty row.'); return; }
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) { toast.warning('Quantities must be positive whole numbers.'); return; }
      const opt = getSelectedOption(item);
      if (!opt || opt.stock < item.quantity) { toast.error(`Insufficient stock for ${opt?.fullName || 'selected item'}`); return; }
      const finalItemPrice = itemUnitPrice(opt.price, item.discountType, item.discountValue);
      itemsToOrder.push({ perfumeId: item.perfumeId, name: opt.fullName, price: opt.price, quantity: Number(item.quantity), discountType: item.discountType, discountValue: Number(item.discountValue) || 0, finalItemPrice });
    }

    try {
      setUploading(true);
      let screenshotUrl = onlinePayment.screenshotUrl;
      if (isOnlinePayment && onlinePayment.screenshot) {
        try { screenshotUrl = await uploadScreenshot(onlinePayment.screenshot); }
        catch { throw new Error('Payment screenshot upload failed. Please try again; the order has not been created.'); }
      }
      const authHeader = { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } };
      // Build payment receiver info if Paid
      let paymentReceiverPayload = undefined;
      if (paymentStatus === 'Paid' && selectedReceiver) {
        const receiverAdmin = adminList.find(a => a._id === selectedReceiver);
        if (receiverAdmin) {
          paymentReceiverPayload = { adminId: receiverAdmin._id, adminName: receiverAdmin.name };
        }
      }

      const orderPayload = {
        ...orderData,
        address: `${orderData.address}, ${district.label}, ${division.label}`,
        items: itemsToOrder, totalAmount: grandTotal, shippingCost, freeDelivery,
        discountApplied: couponDiscount + totalDiscountAmount, paymentMethod, paymentStatus,
        isManual: true, createdBy: adminName,
        createdAt: orderData.orderDate ? new Date(orderData.orderDate).toISOString() : new Date().toISOString(),
        ...(isOnlinePayment && { paymentDetails: { platform: paymentMethod, senderNumber: onlinePayment.senderNumber, transactionId: onlinePayment.transactionId, screenshot: screenshotUrl } }),
        ...(paymentReceiverPayload && { paymentReceivedBy: paymentReceiverPayload })
      };
      await adminAxios.post(`${API_URL}/api/orders/manual`, orderPayload, authHeader);

      setOrderData({ customerName: '', phone: '', address: '', orderDate: getLocalDate() });
      setDivision(null); setDistrict(null);
      setSelectedItems([{ perfumeId: '', variantIdx: null, quantity: 1, discountType: 'none', discountValue: 0 }]);
      setAppliedCoupon(null); setCouponCode('');
      setTotalDiscountType('none'); setTotalDiscountValue(0);
      setPaymentMethod('Cash on Delivery'); setPaymentStatus('Unpaid');
      setFreeDelivery(false);
      setOnlinePayment({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' });
      setSelectedReceiver(null);
      fetchData();
      toast.success('✓ Manual Order Recorded Successfully!');
    } catch (err) {
      let errorMessage = 'Failed to record order.';
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        errorMessage = err.response.data.errors.join('\n');
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      toast.error(`Error: ${errorMessage}`);
    }
    finally { setUploading(false); }
  };

  const customSelectStyles = {
    control: (base, state) => ({ ...base, minHeight: 43, borderColor: state.isFocused ? '#dc4939' : '#e2e2df', borderRadius: 8, fontSize: 13, boxShadow: state.isFocused ? '0 0 0 3px #dc493914' : 'none' }),
    menu: base => ({ ...base, zIndex: 30, fontSize: 13 }),
  };
  const formatMoney = value => `${Number(value).toLocaleString('en-BD', { maximumFractionDigits: 2 })} TK`;
  const deliveryText = !district ? 'Select a district to calculate delivery' : shippingCost === 0 ? 'Free delivery' : formatMoney(shippingCost);

  return (
    <section className="manual-order">
      <header className="mo-header"><p className="mo-eyebrow">SALES / MANUAL ORDER</p><h1>A personal order, made simple.</h1><p>Record a phone, Facebook, or in-person order with every detail in one place.</p></header>
      {perfumes.length === 0 && <div className="mo-empty"><Package size={24} /><div><strong>No products available yet</strong><p>Add products in inventory, or refresh if your product list has not loaded.</p><Link to="/admin/inventory">Open inventory</Link> · <button type="button" onClick={fetchData}>Refresh products</button></div></div>}
      <form onSubmit={handleOrderSubmit}>
      <fieldset disabled={uploading} className="mo-workspace">
        <div className="mo-main">
          <section className="mo-card"><div className="mo-card-heading"><UserRound size={18} /><div><h2>Customer details</h2><p>Who are we preparing this order for?</p></div><span>01</span></div>
            <div className="mo-two-columns">
              <label>Customer name<input required value={orderData.customerName} onChange={e => setOrderData({ ...orderData, customerName: e.target.value })} placeholder="Full name" autoComplete="name" /></label>
              <label>Phone number<input type="tel" required inputMode="numeric" pattern="01[0-9]{9}" maxLength={11} value={orderData.phone} onChange={e => setOrderData({ ...orderData, phone: e.target.value.replace(/\D/g, '') })} placeholder="01XXXXXXXXX" autoComplete="tel-national" /></label>
              <label>Order date<input type="date" required value={orderData.orderDate} onChange={e => setOrderData({ ...orderData, orderDate: e.target.value })} /></label>
            </div>
          </section>
          <section className="mo-card"><div className="mo-card-heading"><ShoppingBag size={18} /><div><h2>Products</h2><p>Choose a fragrance and size, then set the quantity.</p></div><span>02</span></div>
            {selectedItems.map((item, index) => {
              const option = getSelectedOption(item);
              const unitPrice = itemUnitPrice(option?.price || 0, item.discountType, item.discountValue);
              const otherValues = selectedItems.filter((_, i) => i !== index).map(si => si.variantIdx != null ? `${si.perfumeId}__${si.variantIdx}` : si.perfumeId);
              return <div className="mo-item" key={index}>
                <div className="mo-item-top"><span>Item {String(index + 1).padStart(2, '0')}</span>{selectedItems.length > 1 && <button type="button" className="mo-remove" onClick={() => removeItemRow(index)} aria-label={`Remove item ${index + 1}`}><X size={15} /> Remove</button>}</div>
                <div className="mo-item-fields">
                  <div><label htmlFor={`mo-product-${index}`}>Fragrance & size</label><Select inputId={`mo-product-${index}`} options={perfumeOptions.filter(opt => !otherValues.includes(opt.value))} isOptionDisabled={opt => opt.stock <= 0} value={option} isDisabled={uploading} isClearable styles={customSelectStyles} placeholder="Search fragrances…" onChange={opt => setSelectedItems(items => items.map((row, i) => i === index ? { ...row, perfumeId: opt?.perfumeId || '', variantIdx: opt?.variantIdx ?? null, quantity: 1 } : row))} />{option && <small className={option.stock < item.quantity ? 'mo-error' : ''}>{option.stock} available · {formatMoney(option.price)} each</small>}</div>
                  <label>Quantity<input type="number" min="1" max={option?.stock || undefined} step="1" required value={item.quantity} onChange={e => updateItemRow(index, 'quantity', e.target.value)} /></label>
                  <div className="mo-line-total"><span>Line total</span><strong>{formatMoney(unitPrice * (Number(item.quantity) || 0))}</strong></div>
                </div>
                <details className="mo-item-discount"><summary>{item.discountType === 'none' ? 'Add item discount' : 'Item discount applied'}</summary><div className="mo-two-columns">
                  <label>Discount type<select value={item.discountType} onChange={e => { updateItemRow(index, 'discountType', e.target.value); updateItemRow(index, 'discountValue', 0); }}><option value="none">No discount</option><option value="fixed">Fixed (TK per unit)</option><option value="percentage">Percentage (%)</option></select></label>
                  <label>Discount value<input type="number" min="0" max={item.discountType === 'percentage' ? 100 : option?.price} step="0.01" disabled={item.discountType === 'none'} value={item.discountValue} onChange={e => updateItemRow(index, 'discountValue', e.target.value)} /></label>
                </div></details>
              </div>;
            })}
            <button type="button" className="mo-secondary" onClick={addMoreItems} disabled={!perfumeOptions.length}><Plus size={15} /> Add another item</button>
          </section>
          <section className="mo-card"><div className="mo-card-heading"><Truck size={18} /><div><h2>Delivery</h2><p>Set the destination and confirm the shipping charge.</p></div><span>03</span></div>
            <div className="mo-two-columns"><div><label htmlFor="mo-division">Division</label><Select inputId="mo-division" options={locationData.divisions} styles={customSelectStyles} value={division} isDisabled={uploading} placeholder="Select division" onChange={opt => { setDivision(opt); setDistrict(null); }} /></div>
              <div><label htmlFor="mo-district">District / area</label><Select inputId="mo-district" options={division ? locationData.districtsByDivision[division.value] : []} styles={customSelectStyles} value={district} isDisabled={!division || uploading} placeholder="Select district" onChange={setDistrict} /></div></div>
            <label className="mo-full-field">Delivery address<textarea required rows={2} value={orderData.address} onChange={e => setOrderData({ ...orderData, address: e.target.value })} placeholder="House, road, and area details" autoComplete="street-address" /></label>
            <div className="mo-delivery-note"><Truck size={16} /><span>{deliveryText}</span></div>
            <label className="mo-check"><input type="checkbox" checked={freeDelivery} onChange={e => setFreeDelivery(e.target.checked)} /><span>Waive delivery charge<small>Offer free delivery for this order.</small></span></label>
          </section>
          <section className="mo-card"><div className="mo-card-heading"><CreditCard size={18} /><div><h2>Payment</h2><p>Record the payment method and collection status.</p></div><span>04</span></div>
            <div className="mo-two-columns"><label>Payment method<select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setOnlinePayment({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' }); }}>{['Cash on Delivery', 'Bkash', 'Nagad', 'Bank Transfer'].map(method => <option key={method}>{method}</option>)}</select></label>
              <label>Payment status<select value={paymentStatus} onChange={e => { setPaymentStatus(e.target.value); setSelectedReceiver(null); }}><option>Unpaid</option><option>Paid</option></select></label></div>
            {paymentStatus === 'Paid' && <div className="mo-payment-extra"><h3>Who received the payment?</h3>{adminsLoading ? <p>Loading admins…</p> : adminError ? <p className="mo-error">Could not load payment receivers. Refresh the page to try again.</p> : adminList.length === 0 ? <p>No payment receivers available.</p> : <div className="mo-receivers">{adminList.map(admin => <label className="mo-check" key={admin._id}><input type="radio" name="paymentReceiver" required checked={selectedReceiver === admin._id} onChange={() => setSelectedReceiver(admin._id)} /><span>{admin.name}<small>{admin.role === 'superadmin' ? 'Super admin' : 'Admin'}{admin._id === adminData.id ? ' · You' : ''}</small></span></label>)}</div>}</div>}
            {isOnlinePayment && <div className="mo-payment-extra"><h3>{paymentMethod} transaction</h3><div className="mo-two-columns">
              <label>Sender {paymentMethod === 'Bank Transfer' ? 'account number' : 'phone number'}<input required inputMode="numeric" maxLength={paymentMethod === 'Bank Transfer' ? 20 : 11} value={onlinePayment.senderNumber} onChange={e => setOnlinePayment({ ...onlinePayment, senderNumber: e.target.value.replace(/\D/g, '') })} /></label>
              <label>Transaction ID / reference<input required value={onlinePayment.transactionId} onChange={e => setOnlinePayment({ ...onlinePayment, transactionId: e.target.value })} /></label></div>
              <label className="mo-upload"><ImagePlus size={22} /><span>{onlinePayment.screenshot ? 'Replace payment screenshot' : 'Add payment screenshot'}<small>Optional · JPG, PNG, or WebP</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setOnlinePayment({ ...onlinePayment, screenshot: e.target.files[0] || null, screenshotUrl: '' })} /></label>
              {screenshotPreview && <div className="mo-proof"><img src={screenshotPreview} alt="Selected payment proof" /><span>{onlinePayment.screenshot?.name}</span><button type="button" className="mo-remove" onClick={() => setOnlinePayment({ ...onlinePayment, screenshot: null })}>Remove</button></div>}
            </div>}
          </section>
          <details className="mo-card mo-discounts"><summary><Tag size={17} /> Coupons & order discount <span>Optional</span></summary><div className="mo-discount-content">
            <label htmlFor="mo-coupon">Coupon code</label><div className="mo-coupon"><input id="mo-coupon" value={couponCode} disabled={couponLoading} placeholder="Enter code" onChange={e => { setCouponCode(e.target.value.toUpperCase()); setAppliedCoupon(null); }} /><button type="button" className="mo-secondary" disabled={couponLoading || !couponCode.trim()} onClick={handleApplyCoupon}>{couponLoading ? 'Checking…' : 'Apply'}</button></div>
            {appliedCoupon && <div className="mo-applied"><span>{appliedCoupon.code} applied · −{formatMoney(couponDiscount)}</span><button type="button" className="mo-remove" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>Remove</button></div>}
            <div className="mo-two-columns"><label>Order discount<select value={totalDiscountType} onChange={e => { setTotalDiscountType(e.target.value); setTotalDiscountValue(0); }}><option value="none">No discount</option><option value="fixed">Fixed (TK)</option><option value="percentage">Percentage (%)</option></select></label><label>Discount value<input type="number" min="0" max={totalDiscountType === 'percentage' ? 100 : undefined} step="0.01" disabled={totalDiscountType === 'none'} value={totalDiscountValue} onChange={e => setTotalDiscountValue(e.target.value)} /></label></div><small>Item discounts apply first, then the coupon, then the order discount. Delivery is added last.</small>
          </div></details>
        </div>
        <aside className="mo-summary"><div className="mo-summary-heading"><h2>Order summary</h2><span>Manual order</span></div>
          <div className="mo-summary-items">{lines.length ? selectedItems.map((item, index) => { const opt = getSelectedOption(item); return opt ? <div key={index}><span>{opt.fullName}<small>{item.quantity || 0} × {formatMoney(itemUnitPrice(opt.price, item.discountType, item.discountValue))}</small></span><strong>{formatMoney(itemUnitPrice(opt.price, item.discountType, item.discountValue) * (Number(item.quantity) || 0))}</strong></div> : null; }) : <p>Add a fragrance to start your order.</p>}</div>
          <dl className="mo-totals"><div><dt>Products</dt><dd>{formatMoney(productsTotal)}</dd></div>{itemDiscount > 0 && <div className="mo-saving"><dt>Item discounts</dt><dd>−{formatMoney(itemDiscount)}</dd></div>}{appliedCoupon && <div className="mo-saving"><dt>Coupon · {appliedCoupon.code}</dt><dd>−{formatMoney(couponDiscount)}</dd></div>}{totalDiscountAmount > 0 && <div className="mo-saving"><dt>Order discount</dt><dd>−{formatMoney(totalDiscountAmount)}</dd></div>}<div><dt>Delivery</dt><dd>{!district ? 'Pending address' : shippingCost === 0 ? 'Free' : formatMoney(shippingCost)}</dd></div></dl>
          <div className="mo-grand-total"><span>{district ? 'Grand total' : 'Total before delivery'}</span><strong>{formatMoney(grandTotal)}</strong></div>
          <div className="mo-summary-payment"><span>{paymentMethod}</span><span className={paymentStatus === 'Paid' ? 'mo-paid' : ''}>{paymentStatus}</span></div>
          <button type="submit" className="mo-primary" disabled={uploading || couponLoading || !lines.length}>{uploading ? 'Creating order…' : 'Create order'}</button><p className="mo-summary-note">Review the details before creating this order. Stock is updated when the order is saved.</p>
        </aside>
      </fieldset></form>
    </section>
  );
};

export default ManualOrder;
