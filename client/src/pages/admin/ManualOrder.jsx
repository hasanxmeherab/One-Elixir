import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import adminAxios from '../../utils/adminAxios';
import { Link, useOutletContext } from 'react-router-dom';
import Select from 'react-select';
import locationData from '../../data/locationData.json';
import { ImagePlus, Plus, X, UserRound, ShoppingBag, Truck, CreditCard, Tag, Package } from 'lucide-react';
import { itemUnitPrice, manualOrderTotals } from '../../utils/manualOrderTotals';


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
      await adminAxios.post(`${API_URL}/api/orders/manual`, orderPayload);

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
    <section className="manual-order max-w-[1440px]! [margin:0_auto]! pb-[64px]! text-[#242424]! [font-family:'Jost',_sans-serif]! [&_label]:flex! [&_label]:flex-col! [&_label]:gap-[7px]! [&_label]:text-[12px]! [&_label]:font-medium! [&_label]:text-[#666]! [&_input:not([type='radio']):not([type='checkbox']):not([type='file']):not([type='hidden']):not([role='combobox'])]:block! [&_input:not([type='radio']):not([type='checkbox']):not([type='file']):not([type='hidden']):not([role='combobox'])]:w-[100%]! [&_input:not([type='radio']):not([type='checkbox']):not([type='file']):not([type='hidden']):not([role='combobox'])]:min-w-[0]! [&_input:not([type='radio']):not([type='checkbox']):not([type='file']):not([type='hidden']):not([role='combobox'])]:[padding:11px_12px]! [&_input:not([type='radio']):not([type='checkbox']):not([type='file']):not([type='hidden']):not([role='combobox'])]:[border:1px_solid_#e2e2df]! [&_input:not([type='radio']):not([type='checkbox']):not([type='file']):not([type='hidden']):not([role='combobox'])]:rounded-[8px]! [&_input:not([type='radio']):not([type='checkbox']):not([type='file']):not([type='hidden']):not([role='combobox'])]:[outline:none]! [&_input:not([type='radio']):not([type='checkbox']):not([type='file']):not([type='hidden']):not([role='combobox'])]:bg-[white]! [&_input:not([type='radio']):not([type='checkbox']):not([type='file']):not([type='hidden']):not([role='combobox'])]:text-[#333]! [&_input:not([type='radio']):not([type='checkbox']):not([type='file']):not([type='hidden']):not([role='combobox'])]:[font:400_13px_'Jost',_sans-serif]! [&_textarea]:block! [&_textarea]:w-[100%]! [&_textarea]:min-w-[0]! [&_textarea]:[padding:11px_12px]! [&_textarea]:[border:1px_solid_#e2e2df]! [&_textarea]:rounded-[8px]! [&_textarea]:[outline:none]! [&_textarea]:bg-[white]! [&_textarea]:text-[#333]! [&_textarea]:[font:400_13px_'Jost',_sans-serif]! [&_textarea]:[resize:vertical]! [&_select]:block! [&_select]:w-[100%]! [&_select]:min-w-[0]! [&_select]:[padding:11px_12px]! [&_select]:[border:1px_solid_#e2e2df]! [&_select]:rounded-[8px]! [&_select]:[outline:none]! [&_select]:bg-[white]! [&_select]:text-[#333]! [&_select]:[font:400_13px_'Jost',_sans-serif]! [&_input:not([role='combobox']):focus]:[border-color:#dc4939]! [&_input:not([role='combobox']):focus]:[box-shadow:0_0_0_3px_#dc493914]! [&_textarea:focus]:[border-color:#dc4939]! [&_textarea:focus]:[box-shadow:0_0_0_3px_#dc493914]! [&_select:focus]:[border-color:#dc4939]! [&_select:focus]:[box-shadow:0_0_0_3px_#dc493914]! [&_input:not([role='combobox']):disabled]:bg-[#f5f5f3]! [&_input:not([role='combobox']):disabled]:text-[#aaa]! [&_select:disabled]:bg-[#f5f5f3]! [&_select:disabled]:text-[#aaa]! [&_.mo-check]:flex! [&_.mo-check]:flex-row! [&_.mo-check]:items-center! [&_.mo-check]:gap-[11px]! [&_.mo-check]:p-[12px]! [&_.mo-check]:bg-[#fafaf8]! [&_.mo-check]:[border:1px_solid_#eeedea]! [&_.mo-check]:rounded-[7px]! [&_.mo-check]:cursor-pointer! [&_.mo-upload]:relative! [&_.mo-upload]:flex! [&_.mo-upload]:flex-row! [&_.mo-upload]:items-center! [&_.mo-upload]:justify-center! [&_.mo-upload]:gap-[12px]! [&_.mo-upload]:[padding:22px_16px]! [&_.mo-upload]:[border:1px_dashed_#ccc8c4]! [&_.mo-upload]:rounded-[8px]! [&_.mo-upload]:bg-[#faf9f7]! [&_.mo-upload]:cursor-pointer! [&_.mo-upload]:mt-[18px]! [&_button:disabled]:opacity-[.45]! [&_button:disabled]:cursor-not-allowed! [&_.mo-error]:text-[#be493d]! [&_button:focus-visible]:[outline:2px_solid_#dc4939]! [&_button:focus-visible]:[outline-offset:3px]! [&_summary:focus-visible]:[outline:2px_solid_#dc4939]! [&_summary:focus-visible]:[outline-offset:3px]!">
      <header className="mo-header mb-[30px]! [&_h1]:[font:600_clamp(26px,_3vw,_38px)/1.2_'Playfair_Display',_serif]! [&_h1]:m-[0]! [&_h1]:tracking-[-.7px]! [&_>_p:last-child]:text-[#777]! [&_>_p:last-child]:text-[14px]! [&_>_p:last-child]:[margin:12px_0_0]!"><p className="mo-eyebrow text-[#dc4939]! text-[11px]! font-bold! tracking-[2px]! [margin:0_0_10px]!">SALES / MANUAL ORDER</p><h1>A personal order, made simple.</h1><p>Record a phone, Facebook, or in-person order with every detail in one place.</p></header>
      {perfumes.length === 0 && <div className="mo-empty flex! gap-[14px]! items-start! p-[20px]! bg-[#faf8f3]! [border:1px_solid_#ebe5d9]! rounded-[10px]! text-[13px]! mb-[22px]! [&_p]:text-[12px]! [&_p]:text-[#888]! [&_p]:[margin:6px_0]! [&_button]:[border:0]! [&_button]:bg-[transparent]! [&_button]:cursor-pointer! [&_button]:[text-decoration:underline]! [&_>_svg]:[flex-shrink:0]!"><Package size={24} /><div><strong>No products available yet</strong><p>Add products in inventory, or refresh if your product list has not loaded.</p><Link to="/admin/inventory">Open inventory</Link> · <button type="button" onClick={fetchData}>Refresh products</button></div></div>}
      <form onSubmit={handleOrderSubmit}>
      <fieldset disabled={uploading} className="mo-workspace grid! [grid-template-columns:minmax(0,_1.8fr)_minmax(280px,_1fr)]! gap-[26px]! [border:0]! p-[0]! m-[0]! min-w-[0]! [align-items:start]! max-[1100px]:[grid-template-columns:minmax(0,_1fr)]!">
        <div className="mo-main min-w-[0]! flex! flex-col! gap-[20px]!">
          <section className="mo-card [border:1px_solid_#e7e7e5]! rounded-[13px]! p-[24px]! bg-[#fff]! min-w-[0]! max-[600px]:[padding:18px_14px]!"><div className="mo-card-heading flex! items-start! gap-[12px]! mb-[22px]! [&_>_svg]:text-[#dc4939]! [&_>_svg]:[flex-shrink:0]! [&_>_svg]:mt-[2px]! [&_h2]:[font:600_17px_'Jost',_sans-serif]! [&_h2]:m-[0]! [&_p]:text-[#888]! [&_p]:text-[12px]! [&_p]:[margin:4px_0_0]! [&_>_span]:ml-[auto]! [&_>_span]:text-[#bbb]! [&_>_span]:text-[11px]!"><UserRound size={18} /><div><h2>Customer details</h2><p>Who are we preparing this order for?</p></div><span>01</span></div>
            <div className="mo-two-columns grid! [grid-template-columns:repeat(2,_minmax(0,_1fr))]! gap-[16px]! [&_>_div_>_label]:mb-[7px]! max-[600px]:[grid-template-columns:minmax(0,_1fr)]!">
              <label>Customer name<input required value={orderData.customerName} onChange={e => setOrderData({ ...orderData, customerName: e.target.value })} placeholder="Full name" autoComplete="name" /></label>
              <label>Phone number<input type="tel" required inputMode="numeric" pattern="01[0-9]{9}" maxLength={11} value={orderData.phone} onChange={e => setOrderData({ ...orderData, phone: e.target.value.replace(/\D/g, '') })} placeholder="01XXXXXXXXX" autoComplete="tel-national" /></label>
              <label>Order date<input type="date" required value={orderData.orderDate} onChange={e => setOrderData({ ...orderData, orderDate: e.target.value })} /></label>
            </div>
          </section>
          <section className="mo-card [border:1px_solid_#e7e7e5]! rounded-[13px]! p-[24px]! bg-[#fff]! min-w-[0]! max-[600px]:[padding:18px_14px]!"><div className="mo-card-heading flex! items-start! gap-[12px]! mb-[22px]! [&_>_svg]:text-[#dc4939]! [&_>_svg]:[flex-shrink:0]! [&_>_svg]:mt-[2px]! [&_h2]:[font:600_17px_'Jost',_sans-serif]! [&_h2]:m-[0]! [&_p]:text-[#888]! [&_p]:text-[12px]! [&_p]:[margin:4px_0_0]! [&_>_span]:ml-[auto]! [&_>_span]:text-[#bbb]! [&_>_span]:text-[11px]!"><ShoppingBag size={18} /><div><h2>Products</h2><p>Choose a fragrance and size, then set the quantity.</p></div><span>02</span></div>
            {selectedItems.map((item, index) => {
              const option = getSelectedOption(item);
              const unitPrice = itemUnitPrice(option?.price || 0, item.discountType, item.discountValue);
              const otherValues = selectedItems.filter((_, i) => i !== index).map(si => si.variantIdx != null ? `${si.perfumeId}__${si.variantIdx}` : si.perfumeId);
              return <div className="mo-item p-[16px]! bg-[#fafaf8]! [border:1px_solid_#eeedea]! rounded-[9px]! mb-[14px]! max-[600px]:p-[12px]!" key={index}>
                <div className="mo-item-top flex! items-center! justify-between! mb-[14px]! text-[10px]! text-[#999]!"><span>Item {String(index + 1).padStart(2, '0')}</span>{selectedItems.length > 1 && <button type="button" className="mo-remove inline-flex! items-center! justify-center! gap-[7px]! cursor-pointer! [font:500_12px_'Jost',_sans-serif]! p-[0]! [border:0]! bg-[transparent]! text-[#b7675d]! text-[11px]!" onClick={() => removeItemRow(index)} aria-label={`Remove item ${index + 1}`}><X size={15} /> Remove</button>}</div>
                <div className="mo-item-fields [&_>_div_>_label]:flex! [&_>_div_>_label]:flex-col! [&_>_div_>_label]:gap-[7px]! [&_>_div_>_label]:text-[12px]! [&_>_div_>_label]:font-medium! [&_>_div_>_label]:text-[#666]! [&_>_div_>_label]:mb-[7px]! grid! [grid-template-columns:minmax(0,_3fr)_minmax(60px,_.8fr)]! gap-[12px]! [align-items:start]! [&_>_div]:min-w-[0]! [&_small]:block! [&_small]:text-[10px]! [&_small]:text-[#888]! [&_small]:mt-[7px]! max-[600px]:[grid-template-columns:minmax(0,_1fr)_65px]!">
                  <div><label htmlFor={`mo-product-${index}`}>Fragrance & size</label><Select inputId={`mo-product-${index}`} options={perfumeOptions.filter(opt => !otherValues.includes(opt.value))} isOptionDisabled={opt => opt.stock <= 0} value={option} isDisabled={uploading} isClearable styles={customSelectStyles} placeholder="Search fragrances…" onChange={opt => setSelectedItems(items => items.map((row, i) => i === index ? { ...row, perfumeId: opt?.perfumeId || '', variantIdx: opt?.variantIdx ?? null, quantity: 1 } : row))} />{option && <small className={option.stock < item.quantity ? 'mo-error' : ''}>{option.stock} available · {formatMoney(option.price)} each</small>}</div>
                  <label>Quantity<input type="number" min="1" max={option?.stock || undefined} step="1" required value={item.quantity} onChange={e => updateItemRow(index, 'quantity', e.target.value)} /></label>
                  <div className="mo-line-total [grid-column:1_/_-1]! flex! items-center! justify-between! text-[11px]! text-[#888]! [&_strong]:text-[#333]! [&_strong]:text-[13px]! [&_strong]:font-semibold!"><span>Line total</span><strong>{formatMoney(unitPrice * (Number(item.quantity) || 0))}</strong></div>
                </div>
                <details className="mo-item-discount mt-[12px]! pt-[12px]! [border-top:1px_solid_#e7e7e3]! [&_summary]:cursor-pointer! [&_summary]:text-[11px]! [&_summary]:text-[#777]! [&[open]_>_div]:mt-[12px]!"><summary>{item.discountType === 'none' ? 'Add item discount' : 'Item discount applied'}</summary><div className="mo-two-columns grid! [grid-template-columns:repeat(2,_minmax(0,_1fr))]! gap-[16px]! [&_>_div_>_label]:mb-[7px]! max-[600px]:[grid-template-columns:minmax(0,_1fr)]!">
                  <label>Discount type<select value={item.discountType} onChange={e => { updateItemRow(index, 'discountType', e.target.value); updateItemRow(index, 'discountValue', 0); }}><option value="none">No discount</option><option value="fixed">Fixed (TK per unit)</option><option value="percentage">Percentage (%)</option></select></label>
                  <label>Discount value<input type="number" min="0" max={item.discountType === 'percentage' ? 100 : option?.price} step="0.01" disabled={item.discountType === 'none'} value={item.discountValue} onChange={e => updateItemRow(index, 'discountValue', e.target.value)} /></label>
                </div></details>
              </div>;
            })}
            <button type="button" className="mo-secondary inline-flex! items-center! justify-center! gap-[7px]! cursor-pointer! [font:500_12px_'Jost',_sans-serif]! [padding:10px_14px]! [border:1px_solid_#e2e2df]! bg-[white]! text-[#444]! rounded-[7px]! [&:hover]:bg-[#f5f5f3]!" onClick={addMoreItems} disabled={!perfumeOptions.length}><Plus size={15} /> Add another item</button>
          </section>
          <section className="mo-card [border:1px_solid_#e7e7e5]! rounded-[13px]! p-[24px]! bg-[#fff]! min-w-[0]! max-[600px]:[padding:18px_14px]!"><div className="mo-card-heading flex! items-start! gap-[12px]! mb-[22px]! [&_>_svg]:text-[#dc4939]! [&_>_svg]:[flex-shrink:0]! [&_>_svg]:mt-[2px]! [&_h2]:[font:600_17px_'Jost',_sans-serif]! [&_h2]:m-[0]! [&_p]:text-[#888]! [&_p]:text-[12px]! [&_p]:[margin:4px_0_0]! [&_>_span]:ml-[auto]! [&_>_span]:text-[#bbb]! [&_>_span]:text-[11px]!"><Truck size={18} /><div><h2>Delivery</h2><p>Set the destination and confirm the shipping charge.</p></div><span>03</span></div>
            <div className="mo-two-columns grid! [grid-template-columns:repeat(2,_minmax(0,_1fr))]! gap-[16px]! [&_>_div_>_label]:mb-[7px]! max-[600px]:[grid-template-columns:minmax(0,_1fr)]!"><div><label htmlFor="mo-division">Division</label><Select inputId="mo-division" options={locationData.divisions} styles={customSelectStyles} value={division} isDisabled={uploading} placeholder="Select division" onChange={opt => { setDivision(opt); setDistrict(null); }} /></div>
              <div><label htmlFor="mo-district">District / area</label><Select inputId="mo-district" options={division ? locationData.districtsByDivision[division.value] : []} styles={customSelectStyles} value={district} isDisabled={!division || uploading} placeholder="Select district" onChange={setDistrict} /></div></div>
            <label className="mo-full-field mt-[18px]!">Delivery address<textarea required rows={2} value={orderData.address} onChange={e => setOrderData({ ...orderData, address: e.target.value })} placeholder="House, road, and area details" autoComplete="street-address" /></label>
            <div className="mo-delivery-note flex! items-center! gap-[8px]! text-[#777]! text-[12px]! [padding:14px_0]!"><Truck size={16} /><span>{deliveryText}</span></div>
            <label className="mo-check [&_input]:[accent-color:#333]! [&_input]:[flex-shrink:0]! [&_small]:block! [&_small]:mt-[3px]! [&_small]:text-[#999]! [&_small]:text-[10px]! [&_small]:font-normal!"><input type="checkbox" checked={freeDelivery} onChange={e => setFreeDelivery(e.target.checked)} /><span>Waive delivery charge<small>Offer free delivery for this order.</small></span></label>
          </section>
          <section className="mo-card [border:1px_solid_#e7e7e5]! rounded-[13px]! p-[24px]! bg-[#fff]! min-w-[0]! max-[600px]:[padding:18px_14px]!"><div className="mo-card-heading flex! items-start! gap-[12px]! mb-[22px]! [&_>_svg]:text-[#dc4939]! [&_>_svg]:[flex-shrink:0]! [&_>_svg]:mt-[2px]! [&_h2]:[font:600_17px_'Jost',_sans-serif]! [&_h2]:m-[0]! [&_p]:text-[#888]! [&_p]:text-[12px]! [&_p]:[margin:4px_0_0]! [&_>_span]:ml-[auto]! [&_>_span]:text-[#bbb]! [&_>_span]:text-[11px]!"><CreditCard size={18} /><div><h2>Payment</h2><p>Record the payment method and collection status.</p></div><span>04</span></div>
            <div className="mo-two-columns grid! [grid-template-columns:repeat(2,_minmax(0,_1fr))]! gap-[16px]! [&_>_div_>_label]:mb-[7px]! max-[600px]:[grid-template-columns:minmax(0,_1fr)]!"><label>Payment method<select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setOnlinePayment({ senderNumber: '', transactionId: '', screenshot: null, screenshotUrl: '' }); }}>{['Cash on Delivery', 'Bkash', 'Nagad', 'Bank Transfer'].map(method => <option key={method}>{method}</option>)}</select></label>
              <label>Payment status<select value={paymentStatus} onChange={e => { setPaymentStatus(e.target.value); setSelectedReceiver(null); }}><option>Unpaid</option><option>Paid</option></select></label></div>
            {paymentStatus === 'Paid' && <div className="mo-payment-extra [border-top:1px_solid_#eeedea]! pt-[20px]! mt-[20px]! [&_h3]:[font:600_13px_'Jost',_sans-serif]! [&_h3]:[margin:0_0_14px]! [&_>_p]:text-[12px]! [&_>_p]:text-[#888]!"><h3>Who received the payment?</h3>{adminsLoading ? <p>Loading admins…</p> : adminError ? <p className="mo-error">Could not load payment receivers. Refresh the page to try again.</p> : adminList.length === 0 ? <p>No payment receivers available.</p> : <div className="mo-receivers grid! [grid-template-columns:repeat(2,_minmax(0,_1fr))]! gap-[8px]! max-h-[220px]! overflow-y-auto! [&_.mo-check:has(input:checked)]:[border-color:#777]! [&_.mo-check:has(input:checked)]:bg-[#f6f6f3]! max-[600px]:[grid-template-columns:minmax(0,_1fr)]!">{adminList.map(admin => <label className="mo-check [&_input]:[accent-color:#333]! [&_input]:[flex-shrink:0]! [&_small]:block! [&_small]:mt-[3px]! [&_small]:text-[#999]! [&_small]:text-[10px]! [&_small]:font-normal!" key={admin._id}><input type="radio" name="paymentReceiver" required checked={selectedReceiver === admin._id} onChange={() => setSelectedReceiver(admin._id)} /><span>{admin.name}<small>{admin.role === 'superadmin' ? 'Super admin' : 'Admin'}{admin._id === adminData.id ? ' · You' : ''}</small></span></label>)}</div>}</div>}
            {isOnlinePayment && <div className="mo-payment-extra [border-top:1px_solid_#eeedea]! pt-[20px]! mt-[20px]! [&_h3]:[font:600_13px_'Jost',_sans-serif]! [&_h3]:[margin:0_0_14px]! [&_>_p]:text-[12px]! [&_>_p]:text-[#888]!"><h3>{paymentMethod} transaction</h3><div className="mo-two-columns grid! [grid-template-columns:repeat(2,_minmax(0,_1fr))]! gap-[16px]! [&_>_div_>_label]:mb-[7px]! max-[600px]:[grid-template-columns:minmax(0,_1fr)]!">
              <label>Sender {paymentMethod === 'Bank Transfer' ? 'account number' : 'phone number'}<input required inputMode="numeric" maxLength={paymentMethod === 'Bank Transfer' ? 20 : 11} value={onlinePayment.senderNumber} onChange={e => setOnlinePayment({ ...onlinePayment, senderNumber: e.target.value.replace(/\D/g, '') })} /></label>
              <label>Transaction ID / reference<input required value={onlinePayment.transactionId} onChange={e => setOnlinePayment({ ...onlinePayment, transactionId: e.target.value })} /></label></div>
              <label className="mo-upload [&_small]:block! [&_small]:text-[10px]! [&_small]:text-[#999]! [&_small]:mt-[5px]! [&_input]:absolute! [&_input]:w-[100%]! [&_input]:h-[100%]! [&_input]:[inset:0]! [&_input]:opacity-[0]! [&_input]:cursor-pointer! [&:focus-within]:[outline:2px_solid_#dc4939]!"><ImagePlus size={22} /><span>{onlinePayment.screenshot ? 'Replace payment screenshot' : 'Add payment screenshot'}<small>Optional · JPG, PNG, or WebP</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setOnlinePayment({ ...onlinePayment, screenshot: e.target.files[0] || null, screenshotUrl: '' })} /></label>
              {screenshotPreview && <div className="mo-proof flex! items-center! gap-[12px]! mt-[12px]! text-[11px]! text-[#777]! [&_img]:w-[56px]! [&_img]:h-[64px]! [&_img]:object-cover! [&_img]:[border:1px_solid_#eee]! [&_img]:rounded-[5px]! [&_>_span]:[flex:1]! [&_>_span]:min-w-[0]! [&_>_span]:[overflow-wrap:anywhere]!"><img src={screenshotPreview} alt="Selected payment proof" /><span>{onlinePayment.screenshot?.name}</span><button type="button" className="mo-remove inline-flex! items-center! justify-center! gap-[7px]! cursor-pointer! [font:500_12px_'Jost',_sans-serif]! p-[0]! [border:0]! bg-[transparent]! text-[#b7675d]! text-[11px]!" onClick={() => setOnlinePayment({ ...onlinePayment, screenshot: null })}>Remove</button></div>}
            </div>}
          </section>
          <details className="mo-card [border:1px_solid_#e7e7e5]! rounded-[13px]! p-[24px]! bg-[#fff]! min-w-[0]! max-[600px]:[padding:18px_14px]! mo-discounts [&_>_summary]:flex! [&_>_summary]:items-center! [&_>_summary]:gap-[9px]! [&_>_summary]:cursor-pointer! [&_>_summary]:text-[13px]! [&_>_summary]:font-medium! [&_>_summary]:[list-style:none]! [&_>_summary::-webkit-details-marker]:hidden! [&_>_summary_>_svg]:text-[#dc4939]! [&_>_summary_>_span]:text-[#aaa]! [&_>_summary_>_span]:text-[10px]! [&_>_summary_>_span]:ml-[auto]! [&_>_summary::after]:[content:'+']! [&_>_summary::after]:text-[#888]! [&[open]_>_summary::after]:[content:'−']!"><summary><Tag size={17} /> Coupons & order discount <span>Optional</span></summary><div className="mo-discount-content flex! flex-col! gap-[14px]! mt-[20px]! [&_>_small]:text-[#999]! [&_>_small]:text-[11px]! [&_>_small]:leading-[1.6]!">
            <label htmlFor="mo-coupon">Coupon code</label><div className="mo-coupon flex! gap-[10px]! [&_input]:[flex:1]!"><input id="mo-coupon" value={couponCode} disabled={couponLoading} placeholder="Enter code" onChange={e => { setCouponCode(e.target.value.toUpperCase()); setAppliedCoupon(null); }} /><button type="button" className="mo-secondary inline-flex! items-center! justify-center! gap-[7px]! cursor-pointer! [font:500_12px_'Jost',_sans-serif]! [padding:10px_14px]! [border:1px_solid_#e2e2df]! bg-[white]! text-[#444]! rounded-[7px]! [&:hover]:bg-[#f5f5f3]!" disabled={couponLoading || !couponCode.trim()} onClick={handleApplyCoupon}>{couponLoading ? 'Checking…' : 'Apply'}</button></div>
            {appliedCoupon && <div className="mo-applied flex! flex-wrap! justify-between! gap-[8px]! text-[#39805a]! text-[11px]!"><span>{appliedCoupon.code} applied · −{formatMoney(couponDiscount)}</span><button type="button" className="mo-remove inline-flex! items-center! justify-center! gap-[7px]! cursor-pointer! [font:500_12px_'Jost',_sans-serif]! p-[0]! [border:0]! bg-[transparent]! text-[#b7675d]! text-[11px]!" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>Remove</button></div>}
            <div className="mo-two-columns grid! [grid-template-columns:repeat(2,_minmax(0,_1fr))]! gap-[16px]! [&_>_div_>_label]:mb-[7px]! max-[600px]:[grid-template-columns:minmax(0,_1fr)]!"><label>Order discount<select value={totalDiscountType} onChange={e => { setTotalDiscountType(e.target.value); setTotalDiscountValue(0); }}><option value="none">No discount</option><option value="fixed">Fixed (TK)</option><option value="percentage">Percentage (%)</option></select></label><label>Discount value<input type="number" min="0" max={totalDiscountType === 'percentage' ? 100 : undefined} step="0.01" disabled={totalDiscountType === 'none'} value={totalDiscountValue} onChange={e => setTotalDiscountValue(e.target.value)} /></label></div><small>Item discounts apply first, then the coupon, then the order discount. Delivery is added last.</small>
          </div></details>
        </div>
        <aside className="mo-summary sticky! top-[96px]! [border:1px_solid_#e5e5e2]! rounded-[13px]! p-[22px]! bg-[#f8f8f6]! min-w-[0]! [&_h2]:[font:600_18px_'Playfair_Display',_serif]! [&_h2]:m-[0]! max-[1100px]:static!"><div className="mo-summary-heading flex! items-center! justify-between! gap-[8px]! mb-[18px]! [&_>_span]:text-[9px]! [&_>_span]:[border:1px_solid_#e6e3df]! [&_>_span]:bg-[white]! [&_>_span]:[padding:4px_7px]! [&_>_span]:rounded-[4px]! [&_>_span]:text-[#888]! [&_>_span]:whitespace-nowrap!"><h2>Order summary</h2><span>Manual order</span></div>
          <div className="mo-summary-items pb-[18px]! [border-bottom:1px_solid_#e2e2df]! max-h-[260px]! overflow-y-auto! [&_>_div]:flex! [&_>_div]:justify-between! [&_>_div]:items-start! [&_>_div]:gap-[14px]! [&_>_div]:[margin:14px_0]! [&_>_div]:text-[12px]! [&_>_div_>_span]:min-w-[0]! [&_>_div_>_span]:[overflow-wrap:anywhere]! [&_strong]:whitespace-nowrap! [&_strong]:text-[11px]! [&_strong]:font-medium! [&_small]:block! [&_small]:text-[10px]! [&_small]:text-[#999]! [&_small]:mt-[4px]! [&_>_p]:text-[#999]! [&_>_p]:text-[12px]!">{lines.length ? selectedItems.map((item, index) => { const opt = getSelectedOption(item); return opt ? <div key={index}><span>{opt.fullName}<small>{item.quantity || 0} × {formatMoney(itemUnitPrice(opt.price, item.discountType, item.discountValue))}</small></span><strong>{formatMoney(itemUnitPrice(opt.price, item.discountType, item.discountValue) * (Number(item.quantity) || 0))}</strong></div> : null; }) : <p>Add a fragrance to start your order.</p>}</div>
          <dl className="mo-totals [margin:18px_0]! text-[12px]! [&_>_div]:flex! [&_>_div]:justify-between! [&_>_div]:gap-[14px]! [&_>_div]:[margin:12px_0]! [&_>_div]:text-[#777]! [&_dd]:m-[0]! [&_dd]:text-[#444]! [&_dd]:text-right! [&_.mo-saving]:text-[#39805a]! [&_.mo-saving_dd]:text-[#39805a]!"><div><dt>Products</dt><dd>{formatMoney(productsTotal)}</dd></div>{itemDiscount > 0 && <div className="mo-saving"><dt>Item discounts</dt><dd>−{formatMoney(itemDiscount)}</dd></div>}{appliedCoupon && <div className="mo-saving"><dt>Coupon · {appliedCoupon.code}</dt><dd>−{formatMoney(couponDiscount)}</dd></div>}{totalDiscountAmount > 0 && <div className="mo-saving"><dt>Order discount</dt><dd>−{formatMoney(totalDiscountAmount)}</dd></div>}<div><dt>Delivery</dt><dd>{!district ? 'Pending address' : shippingCost === 0 ? 'Free' : formatMoney(shippingCost)}</dd></div></dl>
          <div className="mo-grand-total [border-top:1px_solid_#e2e2df]! pt-[18px]! flex! items-center! justify-between! gap-[12px]! text-[12px]! [&_strong]:text-[25px]! [&_strong]:font-semibold! [&_strong]:whitespace-nowrap! max-[600px]:[&_strong]:text-[23px]!"><span>{district ? 'Grand total' : 'Total before delivery'}</span><strong>{formatMoney(grandTotal)}</strong></div>
          <div className="mo-summary-payment flex! items-center! justify-between! gap-[10px]! [margin:20px_0]! text-[#888]! text-[11px]! [&_>_span:last-child]:bg-[#f4eae5]! [&_>_span:last-child]:text-[#a37359]! [&_>_span:last-child]:rounded-[4px]! [&_>_span:last-child]:[padding:3px_8px]! [&_>_.mo-paid:last-child]:text-[#39805a]! [&_>_.mo-paid:last-child]:bg-[#eaf3ec]!"><span>{paymentMethod}</span><span className={paymentStatus === 'Paid' ? 'mo-paid' : ''}>{paymentStatus}</span></div>
          <button type="submit" className="mo-primary inline-flex! items-center! justify-center! gap-[7px]! cursor-pointer! [font:500_12px_'Jost',_sans-serif]! w-[100%]! [padding:14px_18px]! [border:0]! rounded-[8px]! text-[white]! bg-[#222]! text-[13px]! [&:hover]:bg-[#444]!" disabled={uploading || couponLoading || !lines.length}>{uploading ? 'Creating order…' : 'Create order'}</button><p className="mo-summary-note text-[10px]! leading-[1.7]! text-[#999]! text-center! [margin:12px_0_0]!">Review the details before creating this order. Stock is updated when the order is saved.</p>
        </aside>
      </fieldset></form>
    </section>
  );
};

export default ManualOrder;
