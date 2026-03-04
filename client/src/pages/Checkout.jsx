import React, { useState, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select'; 
import locationData from '../data/locationData.json'; 
import { useToast } from '../context/ToastContext';
import { ImagePlus } from 'lucide-react';

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
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [showModal, setShowModal] = useState(false);
  const [mobilePayment, setMobilePayment] = useState({
    senderNumber: '',
    transactionId: '',
    platform: 'Bkash',
    screenshot: null
  });

  const shippingCost = useMemo(() => {
    if (!formData.district) return 0;
    return formData.district.value === 'Dhaka' ? 80 : 120;
  }, [formData.district]);

  const finalAmount = cartTotal - discount + shippingCost;
  const amountToVerify = paymentMethod === 'Cash on Delivery' ? shippingCost : finalAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/coupons/validate`, { code: couponCode });
      let discountAmount = res.data.discountType === 'percentage' 
        ? (cartTotal * res.data.discountValue) / 100 
        : res.data.discountValue;
      setDiscount(discountAmount);
      toast.success("Coupon applied successfully!");
    } catch (err) {
      toast.error("Invalid or expired coupon.");
      setDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!user) return navigate('/signin', { state: { from: '/checkout' } });
    if (!formData.division || !formData.district || !formData.phone || !formData.address) {
      return toast.warning("Please complete the shipping details form first.");
    }
    setShowModal(true);
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
        data.append("upload_preset", "one_elixir_uploads");
        const res = await axios.post(`https://api.cloudinary.com/v1_1/dluvmed0b/image/upload`, data);
        screenshotUrl = res.data.secure_url;
      } catch (err) {
        setLoading(false);
        return toast.error("Screenshot upload failed. Please try again.");
      }
    }
    const orderData = {
      customerName: formData.name,
      customerEmail: user.email.toLowerCase(),
      phone: formData.phone,
      address: `${formData.address}, ${formData.district.label}, ${formData.division.label}`,
      items: cart.flatMap(item => {
        if (item.isBundle && item.bundleProducts) {
          return item.bundleProducts.map(p => ({
            perfumeId: p._id,
            name: `${p.name} (${item.name})`,
            quantity: item.quantity,
            price: Math.round(item.price / item.bundleProducts.length),
          }));
        }
        return [{
          perfumeId: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        }];
      }),
      totalAmount: finalAmount,
      shippingCost: shippingCost, 
      discountApplied: discount,
      status: 'Pending',
      paymentMethod: paymentMethod,
      paymentStatus: 'Pending Verification',
      paymentDetails: {
        ...mobilePayment,
        screenshot: screenshotUrl,
        amountPaid: amountToVerify
      },
      isManual: false 
    };
    try {
      const res = await axios.post(`${API_URL}/api/orders`, orderData);
      clearCart();
      // ── Pass order data to ThankYou page ──
      navigate('/thank-you', { state: { order: { ...orderData, _id: res.data._id || res.data.order?._id } } });
    } catch (err) {
      toast.error("Order placement failed. Please try again.");
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

  return (
    <div className="px-[8%] pt-28 pb-20 max-w-[1200px] mx-auto">
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
                <div className="text-[11px] text-[#666]">Pay {shippingCost} TK Delivery Charge now, rest on delivery.</div>
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

          {cart.map(item => (
            <div key={item._id} className="flex justify-between text-sm mb-4">
              <span>{item.name} (x{item.quantity})</span>
              <span>{(item.price * item.quantity).toLocaleString()} TK</span>
            </div>
          ))}

          <div className="h-px bg-[#ddd] my-5"></div>

          <div className="flex justify-between text-sm mb-4">
            <span>SUBTOTAL</span><span>{cartTotal.toLocaleString()} TK</span>
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
            <span>TOTAL</span><span>{finalAmount.toLocaleString()} TK</span>
          </div>

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