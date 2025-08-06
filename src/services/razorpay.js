const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order
 * @param {Object} orderData - Order details
 * @param {number} orderData.amount - Amount in paise (₹1 = 100 paise)
 * @param {string} orderData.currency - Currency code (default: INR)
 * @param {string} orderData.receipt - Receipt ID
 * @returns {Promise<Object>} Razorpay order object
 */
const createRazorpayOrder = async (orderData) => {
  try {
    const options = {
      amount: orderData.amount * 100, // Convert to paise
      currency: orderData.currency || 'INR',
      receipt: orderData.receipt,
      notes: {
        order_id: orderData.receipt,
        user_id: orderData.user_id,
      },
    };

    const order = await razorpay.orders.create(options);
    return {
      success: true,
      order: order,
    };
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Verify Razorpay payment signature
 * @param {string} razorpay_order_id - Razorpay order ID
 * @param {string} razorpay_payment_id - Razorpay payment ID
 * @param {string} razorpay_signature - Razorpay signature
 * @returns {boolean} True if signature is valid
 */
const verifyPaymentSignature = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  try {
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return signature === razorpay_signature;
  } catch (error) {
    console.error('Payment signature verification error:', error);
    return false;
  }
};

/**
 * Get payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment details
 */
const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      success: true,
      payment: payment,
    };
  } catch (error) {
    console.error('Get payment details error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  getPaymentDetails,
}; 