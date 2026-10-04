import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select'; 
import locationData from '../data/locationData.json'; 
import { useToast } from '../context/ToastContext';
import { ImagePlus, Check } from 'lucide-react';

const Checkout = () => {
  const toast = useToast();
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useUser();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: '',
    address: '',
    division: null, 
    district: null, 
  });

  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [showModal, setShowModal] = useState(false);
  const [mobilePayment, setMobilePayment] = useState({
    senderNumber: '',
    transactionId: '',
    platform: 'Bkash',
    screenshot: null
  });

  // Local estimate only — shown until the server quote arrives. The server is the source of truth.
  const localShipping = useMemo(() => {
    if (!formData.district) return 0;
    const district = formData.district.value;
    if (district === 'Ashulia (Daffodil Area)') return 0;
    if (district === 'Ashulia (Other)') return 80;
    return district === 'Dhaka' ? 80 : 120;
  }, [formData.district]);

  // 🔒 Only send WHAT is being bought — the server looks up all prices itself
  const quoteItems = useMemo(() => cart.map(item => {
    if (item.isBundle) {
      const bundleId = item.bundleId || String(item._id).replace(/^bundle_/, '');
      return { bundleId, quantity: Number(item.quantity) };
    }
    return { perfumeId: item._id, variantLabel: item.selectedSize || null, quantity: Number(item.quantity) };
  }), [cart]);

  // ── Server-side quote (prices, discount, shipping, total) ──
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const fetchQuote = useCallback(async (couponOverride) => {
    const code = couponOverride !== undefined ? couponOverride : appliedCoupon;
    const res = await axios.post(`${API_URL}/api/orders/quote`, {
      items: quoteItems,
      couponCode: code || null,
      district: formData.district?.value || null,
    });
    return res.data;
  }, [API_URL, quoteItems, appliedCoupon, formData.district]);

  useEffect(() => {
    if (quoteItems.length === 0) { setQuote(null); return; }
    let cancelled = false;
    setQuoteLoading(true);
    fetchQuote()
      .then(q => { if (!cancelled) { setQuote(q); setQuoteError(''); } })
      .catch(err => {
        if (cancelled) return;
        const msg = err.response?.data?.message || 'Could not calculate your total. Please try again.';
        // Applied coupon became invalid → drop it (this re-runs the quote without it)
        if (appliedCoupon && /coupon/i.test(msg)) {
          setAppliedCoupon(null);
          toast.error(msg);
          return;
        }
        setQuote(null);
        setQuoteError(msg);
      })
      .finally(() => { if (!cancelled) setQuoteLoading(false); });
    return () => { cancelled = true; };
  }, [fetchQuote]);

  const subtotal     = quote?.subtotal ?? cartTotal;
  const discount     = quote?.discount ?? 0;
  const shippingCost = quote?.shippingCost ?? localShipping;
  const finalAmount  = quote?.total ?? (cartTotal + localShipping);
  const amountToVerify = paymentMethod === 'Cash on Delivery' ? shippingCost : finalAmount;
  const quoteReady   = !!quote && !quoteLoading && !quoteError;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    try {
      const q = await fetchQuote(couponCode);
      setQuote(q);
      setAppliedCoupon(couponCode);
      toast.success("Coupon applied successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  // Build the order payload — no prices/totals are sent; the server prices the order
  const buildOrderData = (paymentDetails = {}) => ({
    customerName: formData.name,
    customerEmail: user.email.toLowerCase(),
    phone: formData.phone,
    address: `${formData.address}, ${formData.district.label}, ${formData.division.label}`,
    district: formData.district.value,
    items: quoteItems,
    couponCode: appliedCoupon || null,
    paymentMethod: paymentMethod,
    paymentDetails,
    expectedTotal: finalAmount,
  });

  const handleOrderError = (err) => {
    // 409 → prices changed since checkout loaded: refresh totals and let the customer re-confirm
    if (err.response?.status === 409 && err.response.data?.quote) {
      setQuote(err.response.data.quote);
      setShowModal(false);
      toast.warning(err.response.data.message);
      return;
    }
    toast.error(err.response?.data?.message || "Order placement failed. Please try again.");
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!cart || cart.length === 0) {
      toast.warning("Your cart is empty.");
      return navigate('/collection');
    }
    if (!user) return navigate('/signin', { state: { from: '/checkout' } });
    if (!formData.division || !formData.district || !formData.phone || !formData.address) {
      return toast.warning("Please complete the shipping details form first.");
    }
    if (!quoteReady) {
      return toast.warning(quoteError || "Calculating your total, please wait a moment...");
    }
    // Free delivery + Cash on Delivery → skip payment modal
    if (shippingCost === 0 && paymentMethod === 'Cash on Delivery') {
      return handleDirectOrderSubmit();
    }
    setShowModal(true);
  };

  // Direct submit: no payment details needed (free COD)
  const handleDirectOrderSubmit = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/orders`, buildOrderData({}));
      clearCart();
      navigate('/thank-you', { state: { order: res.data } });
    } catch (err) {
      handleOrderError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalOrderSubmit = async () => {
    if (!mobilePayment.senderNumber || !mobilePayment.transactionId || !mobilePayment.screenshot) {
      return toast.warning("Please fill all payment fields and upload your screenshot.");
    }
    setLoading(true);
    let screenshotUrl = "";
    if (mobilePayment.screenshot) {
      try {
        const data = new FormData();
        data.append("file", mobilePayment.screenshot);
        data.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
        const res = await axios.post(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, data);
        screenshotUrl = res.data.secure_url;
      } catch (err) {
        setLoading(false);
        return toast.error("Screenshot upload failed. Please try again.");
      }
    }
    const orderData = buildOrderData({
      senderNumber: mobilePayment.senderNumber,
      transactionId: mobilePayment.transactionId,
      platform: mobilePayment.platform,
      screenshot: screenshotUrl,
    });
    try {
      const res = await axios.post(`${API_URL}/api/orders`, orderData);
      clearCart();
      navigate('/thank-you', { state: { order: res.data } });
    } catch (err) {
      handleOrderError(err);
    } finally {
      setLoading(false);
    }
  };

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      padding: '8px', border: '1px solid #ddd', borderRadius: '0', fontSize: '13px', boxShadow: 'none', '&:hover': { border: '1px solid #000' }
    })
  };

  // ── Step indicator logic ──
  const shippingComplete = !!(formData.name && formData.phone && formData.division && formData.district && formData.address);
  const paymentComplete = !!paymentMethod;
  const currentStep = !shippingComplete ? 1 : !paymentMethod ? 2 : 3;
  const STEPS = [
    { num: 1, label: 'SHIPPING' },
    { num: 2, label: 'PAYMENT' },
    { num: 3, label: 'REVIEW' },
  ];

  return (
    <div className="px-[8%] pt-28 pb-20 max-w-[1200px] mx-auto">

      {/* ── Step Progress Indicator ── */}
      <div className="flex items-center justify-center mb-14 max-w-md mx-auto">
        {STEPS.map((step, i) => {
          const done = step.num < currentStep || (step.num === 1 && shippingComplete) || (step.num === 2 && paymentComplete && shippingComplete);
          const active = step.num === currentStep;
          return (
            <React.Fragment key={step.num}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done ? 'bg-black text-white' : active ? 'border-2 border-black text-black' : 'border-2 border-[#ddd] text-[#ccc]'
                }`}>
                  {done ? <Check size={14} /> : step.num}
                </div>
                <span className={`text-[10px] tracking-[2px] font-bold ${done || active ? 'text-black' : 'text-[#ccc]'}`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-3 mb-5 transition-colors ${done ? 'bg-black' : 'bg-[#ddd]'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-16">

        {/* LEFT: FORM SECTION */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs tracking-[3px] font-bold mb-5">SHIPPING DETAILS</h2>

          <input
            type="text" placeholder="Recipient Name" required
            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            className="p-4 border border-[#ddd] outline-none text-sm"
          />
          <input
            type="tel" placeholder="Phone Number" required
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
            inputMode="numeric" maxLength={11}
            className="p-4 border border-[#ddd] outline-none text-sm"
          />

          {/* Division & District */}
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1">
              <label className="text-[9px] font-bold mb-1 block tracking-wider">DIVISION</label>
              <Select
                options={locationData.divisions}
                styles={customSelectStyles}
                placeholder="Select..."
                value={formData.division}
                onChange={(option) => setFormData({...formData, division: option, district: null})}
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-bold mb-1 block tracking-wider">DISTRICT</label>
              <Select
                options={formData.division ? locationData.districtsByDivision[formData.division.value] : []}
                styles={customSelectStyles}
                placeholder="Search..."
                isDisabled={!formData.division}
                value={formData.district}
                onChange={(option) => setFormData({...formData, district: option})}
              />
            </div>
          </div>

          <textarea
            placeholder="House Number, Road, Area Details" required
            value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
            className="p-4 border border-[#ddd] outline-none text-sm mt-2 min-h-[80px]"
          />

          {/* Coupon */}
          <h2 className="text-xs tracking-[3px] font-bold mt-10 mb-5">COUPON</h2>
          <div className="flex gap-2.5">
            <input
              type="text" placeholder="Enter Code"
              value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="p-4 border border-[#ddd] outline-none text-sm flex-1"
            />
            <button
              type="button" onClick={handleApplyCoupon}
              disabled={couponLoading || !couponCode}
              className="px-6 bg-black text-white border-none cursor-pointer font-bold text-xs disabled:opacity-50"
            >
              {couponLoading ? '...' : 'APPLY'}
            </button>
          </div>

          {/* Payment Method */}
          <h2 className="text-xs tracking-[3px] font-bold mt-10 mb-5">PAYMENT METHOD</h2>
          <div className="flex flex-col gap-2.5">
            <label className="p-4 border border-[#ddd] flex items-center text-sm cursor-pointer hover:border-black transition-colors">
              <input
                type="radio" name="pay" value="Cash on Delivery"
                checked={paymentMethod === 'Cash on Delivery'}
                onChange={e => setPaymentMethod(e.target.value)}
              />
              <div className="ml-2.5">
                <div className="font-bold">Cash on Delivery</div>
                <div className="text-[11px] text-[#666]">
                  {shippingCost === 0
                    ? 'Free delivery — no advance payment needed.'
                    : `Pay ${shippingCost} TK Delivery Charge now, rest on delivery.`}
                </div>
              </div>
            </label>
            <label className="p-4 border border-[#ddd] flex items-center text-sm cursor-pointer hover:border-black transition-colors">
              <input
                type="radio" name="pay" value="Full Payment"
                checked={paymentMethod === 'Full Payment'}
                onChange={e => setPaymentMethod('Full Payment')}
              />
              <div className="ml-2.5">
                <div className="font-bold">Full Payment</div>
                <div className="text-[11px] text-[#666]">Pay {finalAmount} TK now and get a hassle-free delivery.</div>
              </div>
            </label>
          </div>
        </div>

        {/* RIGHT: ORDER SUMMARY */}
        <div className="bg-[#fcfcfc] p-10 border border-[#eee] h-fit">
          <h2 className="text-xs tracking-[3px] font-bold mb-5">ORDER SUMMARY</h2>

          {cart.map((item, idx) => (
            <div key={item.cartKey || item._id} className="flex justify-between text-sm mb-4">
              <span>{item.name}{item.selectedSize ? ` (${item.selectedSize})` : ''} (x{item.quantity})</span>
              <span>{(quote?.lines?.[idx]?.lineTotal ?? item.price * item.quantity).toLocaleString()} TK</span>
            </div>
          ))}

          <div className="h-px bg-[#ddd] my-5"></div>

          <div className="flex justify-between text-sm mb-4">
            <span>SUBTOTAL</span><span>{subtotal.toLocaleString()} TK</span>
          </div>
          {shippingCost > 0 && (
            <div className="flex justify-between text-sm mb-4">
              <span>SHIPPING ({formData.district?.label})</span>
              <span>{shippingCost.toLocaleString()} TK</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-sm mb-4 text-[#e63946]">
              <span>DISCOUNT</span><span>-{discount.toLocaleString()} TK</span>
            </div>
          )}

          <div className="h-px bg-[#ddd] my-5"></div>

          <div className="flex justify-between font-bold text-lg">
            <span>TOTAL</span><span>{quoteLoading ? '...' : `${finalAmount.toLocaleString()} TK`}</span>
          </div>

          {quoteError && (
            <p className="text-xs text-[#e63946] mt-4">{quoteError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-5 text-white border-none cursor-pointer font-bold tracking-[2px] mt-8 transition-colors ${user ? 'bg-black hover:bg-gray-800' : 'bg-[#444] hover:bg-gray-600'}`}
          >
            {loading ? 'PROCESSING...' : user ? 'CONFIRM ORDER' : 'SIGN IN TO ORDER'}
          </button>
        </div>
      </form>

      {/* PAYMENT MODAL */}
      {showModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/70 flex justify-center items-center z-[2000]">
          <div className="bg-white p-8 w-[90%] max-w-[400px] flex flex-col gap-4">
            <h3 className="tracking-wider text-sm font-bold">MOBILE BANKING PAYMENT</h3>

            <div className="bg-[#f9f9f9] p-4 rounded border-l-4 border-black">
              <p className="text-xs m-0">Total Amount to Pay Now:</p>
              <p className="text-2xl font-bold m-0">{amountToVerify.toLocaleString()} TK</p>
              <p className="text-[11px] text-[#888] mt-1">
                {paymentMethod === 'Cash on Delivery' ? "(Delivery Charge)" : "(Full Order Amount)"}
              </p>
            </div>

            <p className="text-xs text-[#666]">Send money to: <b>01816496457 (Personal)</b></p>

            <select
              className="p-4 border border-[#ddd] outline-none text-sm"
              value={mobilePayment.platform}
              onChange={e => setMobilePayment({...mobilePayment, platform: e.target.value})}
            >
              <option value="Bkash">Bkash</option>
              <option value="Nagad">Nagad</option>
            </select>

            <input
              type="tel" placeholder="Sender Phone Number"
              className="p-4 border border-[#ddd] outline-none text-sm"
              inputMode="numeric" maxLength={11}
              value={mobilePayment.senderNumber}
              onChange={e => setMobilePayment({...mobilePayment, senderNumber: e.target.value.replace(/\D/g, '')})}
            />
            <input
              type="text" placeholder="Transaction ID (TrxID)"
              className="p-4 border border-[#ddd] outline-none text-sm"
              onChange={e => setMobilePayment({...mobilePayment, transactionId: e.target.value})}
            />

            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded cursor-pointer transition-colors p-6 ${mobilePayment.screenshot ? 'border-black bg-gray-50' : 'border-[#ddd] hover:border-black hover:bg-gray-50'}`}>
              <ImagePlus size={22} className="text-[#888]" />
              <span className="text-xs font-bold tracking-wider text-black">
                {mobilePayment.screenshot ? 'SCREENSHOT SELECTED' : 'CLICK TO UPLOAD SCREENSHOT'}
              </span>
              <span className="text-[10px] text-[#aaa] text-center">
                {mobilePayment.screenshot ? mobilePayment.screenshot.name : 'JPG, PNG supported'}
              </span>
              <input
                type="file" accept="image/*" className="hidden"
                onChange={e => setMobilePayment({...mobilePayment, screenshot: e.target.files[0]})}
              />
            </label>

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={handleFinalOrderSubmit}
                disabled={loading}
                className="flex-[2] bg-black text-white border-none py-3 cursor-pointer font-bold tracking-wider disabled:opacity-60 hover:bg-gray-800 transition-colors"
              >
                {loading ? 'PROCESSING...' : 'CONFIRM PAYMENT'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 bg-[#888] text-white border-none py-3 cursor-pointer font-bold hover:bg-gray-600 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;