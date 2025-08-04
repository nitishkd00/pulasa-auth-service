// Local test for modern email design
require('dotenv').config();

const { sendOrderStatusUpdateEmail } = require('./src/services/emailService');

async function testLocalEmail() {
  try {
    console.log('🧪 Testing local email with modern design...');
    
    const testOrderDetails = {
      products: [
        {
          name: 'Pulasa Curry',
          quantity: 2,
          price: 1500
        },
        {
          name: 'Premium Wild Pulasa',
          quantity: 1,
          price: 2500
        }
      ]
    };

    const result = await sendOrderStatusUpdateEmail(
      'nitishkumarpandu@gmail.com',
      'LOCAL-TEST-001',
      'Order Confirmed',
      testOrderDetails
    );

    console.log('✅ Local email sent successfully!');
    console.log('Result:', result);
    console.log('\n📧 Check your email for the modern design!');
    
  } catch (error) {
    console.error('❌ Local email test failed:', error);
  }
}

testLocalEmail(); 