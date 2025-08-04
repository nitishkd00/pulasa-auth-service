// Test HTML email generation and sending
const { sendOrderStatusUpdateEmail, createHtmlEmail } = require('./src/services/emailService');

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

// Test HTML generation
console.log('Testing HTML generation...');
const htmlEmail = createHtmlEmail(
  'test@example.com',
  'P000019',
  'Order Confirmed',
  testOrderDetails
);

console.log('Generated HTML Email length:', htmlEmail.length);
console.log('HTML contains logo URL:', htmlEmail.includes('cloudinary.com'));
console.log('HTML contains gradient:', htmlEmail.includes('linear-gradient'));
console.log('HTML contains button:', htmlEmail.includes('Track Your Order'));

// Test the full email sending function
console.log('\nTesting full email function...');
const emailResult = sendOrderStatusUpdateEmail(
  'nitishkumarpandu@gmail.com',
  'TEST-002',
  'Order Confirmed',
  testOrderDetails
);

emailResult.then(result => {
  console.log('Email sent successfully:', result);
}).catch(error => {
  console.error('Email sending failed:', error);
}); 