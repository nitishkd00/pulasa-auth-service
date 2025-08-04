// Test HTML email generation
const { createHtmlEmail } = require('./src/services/emailService');

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

const htmlEmail = createHtmlEmail(
  'test@example.com',
  'P000019',
  'Order Confirmed',
  testOrderDetails
);

console.log('Generated HTML Email:');
console.log(htmlEmail.substring(0, 500) + '...');
console.log('\nHTML length:', htmlEmail.length); 