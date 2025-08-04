// Debug script to test order status update endpoint
const axios = require('axios');

async function testOrderStatusUpdate() {
  try {
    console.log('🧪 Testing order status update endpoint...');
    
    // You'll need to replace these with actual values
    const orderId = 'YOUR_ORDER_ID'; // Replace with actual order ID
    const adminToken = 'YOUR_ADMIN_TOKEN'; // Replace with actual admin token
    
    const response = await axios.patch(
      `https://api.pulasa.com/api/orders/${orderId}/status`,
      {
        status: 'order_confirmed'
      },
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Order status update response:', response.data);
    
  } catch (error) {
    console.error('❌ Order status update failed:', error.response?.data || error.message);
  }
}

testOrderStatusUpdate(); 