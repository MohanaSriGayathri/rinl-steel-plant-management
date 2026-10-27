import React, { useState, useEffect, useCallback } from 'react';
import { Users, Star, Phone, Mail, ShoppingCart, Package, CreditCard, Plus, Minus, Trash2, Calendar, FileText, Shield, Eye, CheckCircle, X, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { VendorOrder } from '../types';

interface SteelProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  description: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  specifications?: string;
  deliveryDate?: string;
}

interface ProductModalData {
  product: SteelProduct;
  action: 'cart' | 'buy';
}

interface OrderTrackingInfo {
  orderId: string;
  items: number;
  totalAmount: number;
  status: string;
  estimatedDelivery: string;
}

const VendorManagement = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalData, setProductModalData] = useState<ProductModalData | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [orderTracking, setOrderTracking] = useState<OrderTrackingInfo | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [lastOrderedItems, setLastOrderedItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [otpProcessing, setOtpProcessing] = useState(false);
  const { user } = useAuth();

  const [productForm, setProductForm] = useState({
    quantity: 1,
    specifications: '',
    deliveryDate: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });

  const [otpForm, setOtpForm] = useState({
    otp: '',
    generatedOtp: '',
    attempts: 0,
    maxAttempts: 3
  });

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }

    const localUserKey = `mms_orders_${user.id}`;
    let cachedList: VendorOrder[] = [];
    try {
      const cached = localStorage.getItem(localUserKey);
      if (cached) {
        cachedList = JSON.parse(cached) as VendorOrder[];
        setOrders(cachedList);
      }
    } catch (e) {
      console.warn('Error reading cached orders:', e);
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendor_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (!error.message.includes('Could not find the table')) {
          console.warn('Error fetching orders from Supabase:', error.message);
        }
      } else if (data) {
        const dbOrders = data as VendorOrder[];
        const combined = [...dbOrders];
        cachedList.forEach(co => {
          if (!combined.some(o => o.order_id === co.order_id)) {
            combined.push(co);
          }
        });
        setOrders(combined);
        try {
          localStorage.setItem(localUserKey, JSON.stringify(combined));
        } catch (saveErr) {
          console.warn('Failed to cache orders to localStorage:', saveErr);
        }
      }
    } catch (err) {
      console.warn('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setOrders([]);
    }
  }, [user, fetchOrders]);

  const vendors = [
    {
      id: 1,
      name: 'Steel Supply Co.',
      category: 'Raw Materials',
      rating: 4.8,
      contact: '+91 (891) 123-4567',
      email: 'contact@steelsupply.com',
      status: 'Active'
    },
    {
      id: 2,
      name: 'Industrial Equipment Ltd.',
      category: 'Machinery',
      rating: 4.6,
      contact: '+91 (891) 987-6543',
      email: 'sales@indequip.com',
      status: 'Active'
    },
    {
      id: 3,
      name: 'Quality Tools Inc.',
      category: 'Tools & Equipment',
      rating: 4.9,
      contact: '+91 (891) 456-7890',
      email: 'info@qualitytools.com',
      status: 'Active'
    }
  ];

  const steelProducts = [
    { id: '1', name: 'Hot Rolled Coils', price: 45000, unit: 'per ton', description: 'High-quality hot rolled steel coils for construction' },
    { id: '2', name: 'Cold Rolled Sheets', price: 52000, unit: 'per ton', description: 'Precision cold rolled steel sheets for automotive' },
    { id: '3', name: 'Wire Rods', price: 48000, unit: 'per ton', description: 'Steel wire rods for manufacturing applications' },
    { id: '4', name: 'Structural Steel', price: 50000, unit: 'per ton', description: 'Beams, angles, and channels for construction' },
    { id: '5', name: 'Steel Plates', price: 47000, unit: 'per ton', description: 'Heavy steel plates for industrial use' },
    { id: '6', name: 'Steel Pipes', price: 55000, unit: 'per ton', description: 'Seamless and welded steel pipes' }
  ];

  const handleProductAction = (product: SteelProduct, action: 'cart' | 'buy') => {
    setProductModalData({ product, action });
    setProductForm({
      quantity: 1,
      specifications: '',
      deliveryDate: ''
    });
    setShowProductModal(true);
    setError(null);
  };

  const handleProductSubmit = () => {
    if (!productModalData) return;
    
    const { product, action } = productModalData;
    
    if (productForm.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    const cartItem: CartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: productForm.quantity,
      unit: 'tons',
      specifications: productForm.specifications,
      deliveryDate: productForm.deliveryDate
    };

    if (action === 'cart') {
      addToCart(cartItem);
      setShowProductModal(false);
    } else {
      // Buy now - if not logged in, prompt user to log in so the order belongs to their account
      setCart([cartItem]);
      setShowProductModal(false);
      if (!user) {
        setShowAuthPrompt(true);
      } else {
        setShowPayment(true);
      }
    }
  };

  const addToCart = (newItem: CartItem) => {
    const existingItem = cart.find(item => 
      item.id === newItem.id && 
      item.specifications === newItem.specifications &&
      item.deliveryDate === newItem.deliveryDate
    );
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === existingItem.id && 
        item.specifications === existingItem.specifications &&
        item.deliveryDate === existingItem.deliveryDate
          ? { ...item, quantity: item.quantity + newItem.quantity }
          : item
      ));
    } else {
      setCart([...cart, newItem]);
    }
  };

  const updateCartQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }
    setCart(cart.map((item, i) => 
      i === index ? { ...item, quantity } : item
    ));
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setError('Your cart is empty');
      return;
    }
    setShowCart(false);
    if (!user) {
      setShowAuthPrompt(true);
    } else {
      setShowPayment(true);
    }
  };

  const generateOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
  };

  const validatePaymentForm = () => {
    if (!paymentForm.cardNumber || paymentForm.cardNumber.replace(/\s/g, '').length < 16) {
      setError('Please enter a valid 16-digit card number');
      return false;
    }
    if (!paymentForm.expiryDate || !/^\d{2}\/\d{2}$/.test(paymentForm.expiryDate)) {
      setError('Please enter expiry date in MM/YY format');
      return false;
    }
    if (!paymentForm.cvv || paymentForm.cvv.length < 3) {
      setError('Please enter a valid CVV (3-4 digits)');
      return false;
    }
    if (!paymentForm.cardholderName.trim()) {
      setError('Please enter cardholder name');
      return false;
    }
    return true;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePaymentForm()) {
      return;
    }

    setPaymentProcessing(true);
    setError(null);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate OTP and proceed to verification
      const generatedOtp = generateOtp();
      setOtpForm({
        otp: '',
        generatedOtp,
        attempts: 0,
        maxAttempts: 3
      });
      
      setPaymentProcessing(false);
      setShowPayment(false);
      setShowOtpVerification(true);
      
      // In a real app, you would send this OTP via SMS/email
      console.log('Generated OTP for verification:', generatedOtp);
      
    } catch (error) {
      console.error('Error processing payment:', error);
      setError('Payment processing failed. Please try again.');
      setPaymentProcessing(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpForm.otp || otpForm.otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setOtpProcessing(true);
    setError(null);

    try {
      // Simulate OTP verification delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (otpForm.otp === otpForm.generatedOtp) {
        // OTP verified successfully!
        const orderTimestamp = Date.now();
        const cartSnapshot = [...cart];

        // 1. Create robust placed order records
        const newPlacedOrders: VendorOrder[] = cartSnapshot.map((item, idx) => {
          const ordNum = Math.floor(100000 + Math.random() * 900000);
          const orderId = `ORD-${ordNum}-${idx + 1}`;
          return {
            id: `ord-${orderTimestamp}-${idx}`,
            order_id: orderId,
            user_id: user?.id || 'guest-session',
            product: item.name,
            quantity: item.quantity,
            unit: item.unit || 'tons',
            unit_price: item.price,
            total_amount: item.price * item.quantity,
            specifications: item.specifications || 'Standard RINL Structural Grade IS 2062',
            delivery_date: item.deliveryDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            status: 'Processing',
            payment_status: 'Paid',
            payment_method: 'Card / Online Payment',
            delivery_address: 'RINL Visakhapatnam Steel Plant, Material Stores Yard 2',
            notes: 'Order confirmed and scheduled for production dispatch.',
            created_at: new Date().toISOString()
          };
        });

        // 2. Immediately update orders state so Your Orders count updates right away!
        setOrders(prev => {
          const updated = [...newPlacedOrders, ...prev];
          if (user) {
            try {
              localStorage.setItem(`mms_orders_${user.id}`, JSON.stringify(updated));
            } catch (e) {
              console.warn('LocalStorage save error:', e);
            }
          }
          return updated;
        });
        setLastOrderedItems(cartSnapshot);

        const primaryOrderId = newPlacedOrders[0]?.order_id || `ORD-${orderTimestamp}`;
        const trackingInfo: OrderTrackingInfo = {
          orderId: primaryOrderId,
          items: cartSnapshot.length,
          totalAmount: getCartTotal(),
          status: 'Processing',
          estimatedDelivery: new Date(Date.now() + 7 * 86400000).toLocaleDateString()
        };

        setOrderTracking(trackingInfo);
        setPaymentSuccess(true);
        setShowOtpVerification(false);
        setCart([]);

        // 3. Sync to Supabase in the background if authenticated (without blocking)
        if (user) {
          for (const ord of newPlacedOrders) {
            try {
              await supabase.from('vendor_orders').insert([
                {
                  order_id: ord.order_id,
                  product: ord.product,
                  quantity: ord.quantity,
                  unit: ord.unit,
                  unit_price: ord.unit_price,
                  total_amount: ord.total_amount,
                  specifications: ord.specifications,
                  delivery_date: ord.delivery_date,
                  status: ord.status,
                  payment_status: ord.payment_status,
                  user_id: user.id
                }
              ]);
            } catch (dbErr) {
              console.warn('Vendor order cloud sync notice:', dbErr);
            }
          }
        }
      } else {
        // OTP verification failed
        const newAttempts = otpForm.attempts + 1;
        if (newAttempts >= otpForm.maxAttempts) {
          setError('Maximum OTP attempts exceeded. Please restart the payment process.');
          setShowOtpVerification(false);
          setShowPayment(true);
          setOtpForm({
            otp: '',
            generatedOtp: '',
            attempts: 0,
            maxAttempts: 3
          });
        } else {
          setError(`Invalid OTP. ${otpForm.maxAttempts - newAttempts} attempts remaining.`);
          setOtpForm({
            ...otpForm,
            otp: '',
            attempts: newAttempts
          });
        }
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError('OTP verification failed. Please try again.');
    } finally {
      setOtpProcessing(false);
    }
  };

  const handleCancelPayment = () => {
    setShowPayment(false);
    setPaymentForm({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: ''
    });
    setError(null);
  };

  const handleCancelOtp = () => {
    setShowOtpVerification(false);
    setShowPayment(true);
    setOtpForm({
      otp: '',
      generatedOtp: '',
      attempts: 0,
      maxAttempts: 3
    });
    setError(null);
  };

  const resetOrder = () => {
    setShowProductModal(false);
    setShowPayment(false);
    setShowOtpVerification(false);
    setPaymentSuccess(false);
    setOrderTracking(null);
    setError(null);
    setProductModalData(null);
    setPaymentForm({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: ''
    });
    setOtpForm({
      otp: '',
      generatedOtp: '',
      attempts: 0,
      maxAttempts: 3
    });
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  if (paymentSuccess && orderTracking) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
            <p className="text-gray-600 mb-6">Your payment has been verified and your steel order has been confirmed.</p>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-teal-600" />
                Order Receipt & Confirmation
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Order ID:</span>
                  <p className="font-bold text-gray-900 mt-0.5">{orderTracking.orderId}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Total Items:</span>
                  <p className="font-bold text-gray-900 mt-0.5">{orderTracking.items} items</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Total Amount:</span>
                  <p className="font-bold text-teal-700 mt-0.5">₹{orderTracking.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Payment Status:</span> 
                  <p className="mt-0.5"><span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Paid</span></p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Order Status:</span> 
                  <p className="mt-0.5"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">{orderTracking.status}</span></p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Estimated Delivery:</span>
                  <p className="font-bold text-gray-900 mt-0.5">{orderTracking.estimatedDelivery}</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Ordered Steel Products:</h4>
                <div className="space-y-2">
                  {lastOrderedItems.length > 0 ? (
                    lastOrderedItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm bg-white p-3 rounded border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity} {item.unit || 'tons'} &bull; {item.specifications || 'Standard Grade'}</p>
                        </div>
                        <span className="font-bold text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Order confirmed and scheduled for RINL stockyard dispatch.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => {
                  setPaymentSuccess(false);
                  setOrderTracking(null);
                  if (orders.length > 0) {
                    setSelectedOrder(orders[0]);
                  }
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>View Order Details</span>
              </button>
              <button
                onClick={resetOrder}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2.5 rounded-md font-medium transition-colors duration-200"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showOtpVerification) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <Shield className="h-12 w-12 text-teal-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">OTP Verification</h2>
              <p className="text-gray-600 mt-2">Enter the 6-digit OTP to complete your payment</p>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Sample OTP:</strong> <span className="font-mono font-bold tracking-wider">{otpForm.generatedOtp}</span>
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Use this 6-digit test code to verify payment
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpForm(prev => ({ ...prev, otp: prev.generatedOtp }))}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-sm transition-colors"
                >
                  Auto-fill
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otpForm.otp}
                  onChange={(e) => setOtpForm({...otpForm, otp: e.target.value.replace(/\D/g, '')})}
                  placeholder="123456"
                  maxLength={6}
                  required
                  disabled={otpProcessing}
                  className="w-full px-3 py-3 text-center text-lg font-mono border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Attempts remaining: {otpForm.maxAttempts - otpForm.attempts}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Payment Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{getCartItemCount()} items</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span>₹{getCartTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={otpProcessing || otpForm.otp.length !== 6}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {otpProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    'Verify & Place Order'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelOtp}
                  disabled={otpProcessing}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-4 rounded-md transition-colors duration-200 disabled:opacity-50"
                >
                  Back to Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (showPayment) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <CreditCard className="h-12 w-12 text-teal-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Payment Gateway</h2>
              <p className="text-gray-600">Complete your order payment</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Order Summary</h3>
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} ({item.quantity} tons)</span>
                    <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>₹{getCartTotal().toLocaleString()}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  value={paymentForm.cardholderName}
                  onChange={(e) => setPaymentForm({...paymentForm, cardholderName: e.target.value})}
                  placeholder="John Doe"
                  required
                  disabled={paymentProcessing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <input
                  type="text"
                  value={paymentForm.cardNumber}
                  onChange={(e) => setPaymentForm({...paymentForm, cardNumber: formatCardNumber(e.target.value)})}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                  disabled={paymentProcessing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="text"
                    value={paymentForm.expiryDate}
                    onChange={(e) => setPaymentForm({...paymentForm, expiryDate: formatExpiryDate(e.target.value)})}
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                    disabled={paymentProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                  <input
                    type="text"
                    value={paymentForm.cvv}
                    onChange={(e) => setPaymentForm({...paymentForm, cvv: e.target.value.replace(/\D/g, '')})}
                    placeholder="123"
                    maxLength={4}
                    required
                    disabled={paymentProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={paymentProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {paymentProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Pay Now'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelPayment}
                  disabled={paymentProcessing}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-md transition-colors duration-200 disabled:opacity-50"
                >
                  Cancel Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
            <p className="text-gray-600 mt-2">Manage supplier relationships and order steel products</p>
          </div>
          
          {/* Cart Button */}
          <div className="flex space-x-4">
            <button
              onClick={() => setShowCart(true)}
              className="relative bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors duration-200"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Cart</span>
              {getCartItemCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getCartItemCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Product Modal */}
        {showProductModal && productModalData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {productModalData.action === 'cart' ? 'Add to Cart' : 'Buy Now'} - {productModalData.product.name}
                </h3>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900">{productModalData.product.name}</p>
                <p className="text-sm text-gray-600">{productModalData.product.description}</p>
                <p className="text-lg font-bold text-teal-600 mt-2">
                  ₹{productModalData.product.price.toLocaleString()} {productModalData.product.unit}
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Package className="h-4 w-4 inline mr-1" />
                    Quantity (tons)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.quantity}
                    onChange={(e) => setProductForm({...productForm, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Specifications
                  </label>
                  <textarea
                    value={productForm.specifications}
                    onChange={(e) => setProductForm({...productForm, specifications: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter product specifications and requirements..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Preferred Delivery Date
                  </label>
                  <input
                    type="date"
                    value={productForm.deliveryDate}
                    onChange={(e) => setProductForm({...productForm, deliveryDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Amount:</span>
                    <span className="font-bold text-lg text-teal-600">
                      ₹{(productModalData.product.price * productForm.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleProductSubmit}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-md transition-colors duration-200"
                  >
                    {productModalData.action === 'cart' ? 'Add to Cart' : 'Proceed to Payment'}
                  </button>
                  <button
                    onClick={() => setShowProductModal(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cart Modal */}
        {showCart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Shopping Cart</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item, index) => (
                      <div key={index} className="border-b pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{item.name}</h4>
                          <button
                            onClick={() => removeFromCart(index)}
                            className="p-1 rounded-full bg-red-200 hover:bg-red-300 text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600">₹{item.price.toLocaleString()} per ton</p>
                        {item.specifications && (
                          <p className="text-xs text-gray-500 mt-1">Specs: {item.specifications}</p>
                        )}
                        {item.deliveryDate && (
                          <p className="text-xs text-gray-500">Delivery: {new Date(item.deliveryDate).toLocaleDateString()}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateCartQuantity(index, item.quantity - 1)}
                              className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(index, item.quantity + 1)}
                              className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="font-semibold">₹{(item.quantity * item.price).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-lg">₹{getCartTotal().toLocaleString()}</span>
                    </div>
                    <button
                      onClick={handleCheckout}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-md transition-colors duration-200"
                    >
                      Checkout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {!user && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-700 flex items-center justify-between">
            <div className="flex items-center">
              <Info className="h-5 w-5 mr-3 flex-shrink-0 text-blue-500" />
              <p className="text-sm">
                Viewing in guest exploration mode. You can test ordering steel products and order tracking. <a href="/login" className="underline font-semibold hover:text-blue-900">Sign in</a> to save orders permanently to your Supabase account.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Vendors</p>
                <p className="text-2xl font-bold text-gray-900">24</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">4.7</p>
              </div>
            </div>
          </div>
          
          <div
            onClick={() => {
              if (orders.length === 1) {
                setSelectedOrder(orders[0]);
              } else {
                setShowOrdersModal(true);
              }
            }}
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:border-teal-500 border border-transparent transition-all group"
            title="Click to view details of your orders"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-green-500 group-hover:scale-110 transition-transform" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Your Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                </div>
              </div>
              <span className="text-xs text-teal-600 font-semibold bg-teal-50 px-2.5 py-1 rounded-full group-hover:bg-teal-600 group-hover:text-white transition-colors">
                View Details &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* Steel Products */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Available Steel Products</h3>
            <p className="text-sm text-gray-600">Choose products and specify your requirements</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {steelProducts.map((product) => (
              <div key={product.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center mb-4">
                  <Package className="h-6 w-6 text-teal-500 mr-3" />
                  <h4 className="text-lg font-semibold text-gray-900">{product.name}</h4>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                
                <div className="mb-4">
                  <p className="text-2xl font-bold text-teal-600">₹{product.price.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">{product.unit}</p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleProductAction(product, 'cart')}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center text-sm"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Add to Cart
                  </button>
                  <button
                    onClick={() => handleProductAction(product, 'buy')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center text-sm"
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order History */}
        {orders.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Your Order History</h3>
              {loading && <span className="text-xs text-gray-400">Refreshing...</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivery Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-700">
                        {order.order_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {order.product}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.quantity} tons
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₹{order.total_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'TBD'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vendor Directory */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Vendor Directory</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{vendor.name}</h4>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {vendor.status}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{vendor.category}</p>
                
                <div className="flex items-center mb-3">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="ml-1 text-sm text-gray-600">{vendor.rating}/5.0</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {vendor.contact}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {vendor.email}
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-sm py-2 px-3 rounded-md transition-colors duration-200">
                    Contact
                  </button>
                  <button className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 text-sm py-2 px-3 rounded-md transition-colors duration-200">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">
                    Order Details
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">Order #{selectedOrder.order_id}</h3>
                  <p className="text-xs text-gray-500">
                    Placed on {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'Recent Session'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Product & Cost Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">{selectedOrder.product}</h4>
                    <p className="text-xs text-gray-600 mt-0.5">Specifications: {selectedOrder.specifications || 'Standard RINL Grade IS 2062'}</p>
                  </div>
                  <span className="font-bold text-teal-700 text-lg">
                    ₹{selectedOrder.total_amount.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 pt-3 border-t border-gray-200 mt-2">
                  <div><span className="font-medium text-gray-700">Quantity:</span> {selectedOrder.quantity} {selectedOrder.unit || 'tons'}</div>
                  <div><span className="font-medium text-gray-700">Unit Rate:</span> ₹{selectedOrder.unit_price.toLocaleString()}/ton</div>
                  <div>
                    <span className="font-medium text-gray-700">Payment Status:</span>{' '}
                    <span className="text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded">
                      {selectedOrder.payment_status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Order Status:</span>{' '}
                    <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div><span className="font-medium text-gray-700">Target Delivery:</span> {selectedOrder.delivery_date ? new Date(selectedOrder.delivery_date).toLocaleDateString() : '7 business days'}</div>
                  <div><span className="font-medium text-gray-700">Payment Mode:</span> {selectedOrder.payment_method || 'Online NetBanking'}</div>
                </div>
              </div>

              {/* Progress Stepper Timeline */}
              <div className="mb-6">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Status & Tracking</h5>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-200">
                  <div className="relative flex items-start">
                    <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white text-xs">✓</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Order Placed & Verified</p>
                      <p className="text-xs text-gray-500">Payment approved via secure 6-digit OTP confirmation</p>
                    </div>
                  </div>
                  <div className="relative flex items-start">
                    <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white text-xs">✓</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Processing at Steel Mills</p>
                      <p className="text-xs text-gray-500">Material allocation & mill test certification scheduled</p>
                    </div>
                  </div>
                  <div className="relative flex items-start">
                    <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs">3</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Dispatch via Rail / Freight</p>
                      <p className="text-xs text-gray-400">Scheduled for transport to plant siding</p>
                    </div>
                  </div>
                  <div className="relative flex items-start">
                    <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs">4</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Delivered to Plant Yard</p>
                      <p className="text-xs text-gray-400">Stores gate inward clearance</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Destination */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-900 mb-6">
                <p className="font-semibold mb-0.5">Delivery Destination:</p>
                <p>RINL Visakhapatnam Steel Plant, Central Stockyard Gate 3, Visakhapatnam, AP - 530031</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md text-sm font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* All Orders List Modal */}
        {showOrdersModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Your Placed Orders ({orders.length})</h3>
                  <p className="text-xs text-gray-500">Track and view details of all your steel procurement orders</p>
                </div>
                <button
                  onClick={() => setShowOrdersModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">No orders placed yet</p>
                  <p className="text-xs text-gray-400 mt-1">Browse our steel products below and click "Buy Now" to place your first order.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div
                      key={ord.id || ord.order_id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-teal-500 hover:shadow-sm transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-teal-700 text-sm">{ord.order_id}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 font-medium mt-1">{ord.product}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ord.quantity} {ord.unit || 'tons'} &bull; ₹{ord.total_amount.toLocaleString()} &bull; Delivery: {ord.delivery_date ? new Date(ord.delivery_date).toLocaleDateString() : '7 business days'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowOrdersModal(false);
                          setSelectedOrder(ord);
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium py-2 px-3 rounded-md flex items-center space-x-1 transition-colors whitespace-nowrap"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Details</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Auth Prompt Modal */}
        {showAuthPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 text-center shadow-2xl">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sign In to Your Account</h3>
              <p className="text-sm text-gray-600 mb-6">
                To store orders in the database and access them every time you open your respective account, please log in.
              </p>
              <div className="space-y-3">
                <a
                  href="/login"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors block text-center"
                >
                  Sign In to Account
                </a>
                <button
                  onClick={() => {
                    setShowAuthPrompt(false);
                    setShowPayment(true);
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md text-xs transition-colors"
                >
                  Continue as Guest (Demo Mode)
                </button>
                <button
                  onClick={() => setShowAuthPrompt(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs block mx-auto pt-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorManagement;